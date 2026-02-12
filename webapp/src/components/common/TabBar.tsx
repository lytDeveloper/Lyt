import { Box } from '@mui/material';
import { TabButton, TabLabel, TabContainer } from '../../styles/components/navigation.styles';

export interface TabItem<T = string> {
  key: T;
  label: string;
  disabled?: boolean;
  disabledMessage?: string;
  badge?: number;
}

interface TabBarProps<T = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export default function TabBar<T = string>({ tabs, activeTab, onTabChange }: TabBarProps<T>) {

  return (
    <Box sx={{ mb: 2.5 }}>
      <TabContainer>
        {tabs.map(({ key, label, disabled, disabledMessage, badge }) => {
          const isActive = activeTab === key;
          const isDisabled = disabled ?? false;

          return (
            <TabButton
              key={String(key)}
              active={isActive}
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) {
                  if (disabledMessage) {
                    alert(disabledMessage);
                  }
                  return;
                }
                onTabChange(key);
              }}
            >
              <TabLabel active={isActive} disabled={isDisabled} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' }}>
                {label}
                {badge !== undefined && badge > 0 && (
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 16,
                      height: 16,
                      px: 0.5,
                      borderRadius: 8,
                      bgcolor: '#1972E6',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      lineHeight: 1,
                      zIndex: 1,
                    }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </Box>
                )}
              </TabLabel>
            </TabButton>
          );
        })}
      </TabContainer>
    </Box>
  );
}
