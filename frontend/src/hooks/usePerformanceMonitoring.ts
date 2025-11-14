// src/hooks/usePerformanceMonitoring.ts
import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  cls: number | null;
  fid: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
}

export const usePerformanceMonitoring = () => {
  const logMetric = useCallback((metric: any) => {
    // Send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to monitoring service
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(console.error);
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance metric:', metric);
    }
  }, []);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(logMetric);
      getFID(logMetric);
      getFCP(logMetric);
      getLCP(logMetric);
      getTTFB(logMetric);
    });

    // Custom performance monitoring
    if (typeof window !== 'undefined' && window.performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            logMetric({
              name: 'navigation',
              value: navEntry.loadEventEnd - navEntry.fetchStart,
              entries: [navEntry],
            });
          }
          
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.initiatorType === 'fetch' || resourceEntry.initiatorType === 'xmlhttprequest') {
              logMetric({
                name: 'api-call',
                value: resourceEntry.duration,
                url: resourceEntry.name,
              });
            }
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }

      return () => {
        observer.disconnect();
      };
    }
  }, [logMetric]);

  // Memory monitoring (Chrome only)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        if (memory) {
          const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
          if (usedPercent > 90) {
            console.warn(`High memory usage: ${usedPercent.toFixed(2)}%`);
            logMetric({
              name: 'memory-warning',
              value: usedPercent,
              used: memory.usedJSHeapSize,
              limit: memory.jsHeapSizeLimit,
            });
          }
        }
      };

      const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [logMetric]);

  // FPS monitoring for animations
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 30) {
          console.warn(`Low FPS detected: ${fps}`);
          logMetric({
            name: 'low-fps',
            value: fps,
            timestamp: currentTime,
          });
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [logMetric]);
};