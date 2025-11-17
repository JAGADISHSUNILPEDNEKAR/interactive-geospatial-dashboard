// src/components/Layout/Sidebar.tsx
import {
  Box,
  VStack,
  Text,
  Icon,
  Link,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiMap, FiBarChart2, FiActivity, FiSettings, FiDatabase, FiGlobe } from 'react-icons/fi';

const menuItems = [
  { name: 'Map View', icon: FiMap, href: '#map' },
  { name: 'Analytics', icon: FiBarChart2, href: '#analytics' },
  { name: 'Real-Time', icon: FiActivity, href: '#realtime' },
  { name: 'Data Sources', icon: FiDatabase, href: '#data' },
  { name: 'Global View', icon: FiGlobe, href: '#global' },
  { name: 'Settings', icon: FiSettings, href: '#settings' },
];

export const Sidebar: React.FC = () => {
  const bg = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.800');

  return (
    <Box
      bg={bg}
      borderRight="1px"
      borderColor={borderColor}
      w="250px"
      h="100%"
      p={4}
    >
      <VStack align="stretch" spacing={2}>
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            _hover={{ textDecoration: 'none', bg: hoverBg }}
            p={3}
            borderRadius="md"
            display="flex"
            alignItems="center"
          >
            <Icon as={item.icon} mr={3} />
            <Text>{item.name}</Text>
          </Link>
        ))}
      </VStack>
    </Box>
  );
};