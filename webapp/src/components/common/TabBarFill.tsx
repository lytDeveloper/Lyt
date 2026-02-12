import { Box } from '@mui/material';
import { TabButtonFill, TabLabelFill, TabContainer } from '../../styles/components/navigation.styles';

export interface TabItem<T = string> {
  key: T;
  label: string;
  disabled?: boolean;
  disabledMessage?: string;
}

interface TabBarProps<T = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export default function TabBar<T = string>({ tabs, activeTab, onTabChange }: TabBarProps<T>) {

  return (
    <Box sx={{ mb: 1 }}>
      <TabContainer>
        {tabs.map(({ key, label, disabled, disabledMessage }) => {
          const isActive = activeTab === key;
          const isDisabled = disabled ?? false;

          return (
            <TabButtonFill
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
              <TabLabelFill active={isActive} disabled={isDisabled}>
                {label}
              </TabLabelFill>
            </TabButtonFill>
          );
        })}
      </TabContainer>
    </Box>
  );
}
