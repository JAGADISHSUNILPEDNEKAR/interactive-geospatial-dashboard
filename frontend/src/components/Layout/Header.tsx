// src/components/Layout/Header.tsx
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Button,
  Text,
  useColorMode,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, HamburgerIcon, BellIcon } from '@chakra-ui/icons';

export const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box bg={bg} px={4} borderBottom="1px" borderColor={borderColor}>
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <HStack spacing={8} alignItems="center">
          <IconButton
            aria-label="Menu"
            icon={<HamburgerIcon />}
            variant="ghost"
          />
          <Text fontSize="xl" fontWeight="bold">
            Geospatial Dashboard
          </Text>
        </HStack>

        <HStack spacing={4}>
          <IconButton
            aria-label="Notifications"
            icon={<BellIcon />}
            variant="ghost"
          />
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
          />
          <Menu>
            <MenuButton as={Button} variant="ghost" p={0}>
              <Avatar size="sm" name="User" />
            </MenuButton>
            <MenuList>
              <MenuItem>Profile</MenuItem>
              <MenuItem>Settings</MenuItem>
              <MenuItem>Logout</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};