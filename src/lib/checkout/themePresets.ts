export interface ThemePreset {
  name: 'light' | 'dark' | 'custom';
  colors: {
    background: string;
    primaryText: string;
    secondaryText: string;
    active: string;
    icon: string;
    formBackground: string;
    border?: string;
    placeholder?: string;
    inputBackground?: string;
    unselectedButton: {
      text: string;
      background: string;
      icon: string;
      border?: string;
    };
    selectedButton: {
      text: string;
      background: string;
      icon: string;
      border?: string;
    };
    box: {
      headerBg: string;
      headerPrimaryText: string;
      headerSecondaryText: string;
      bg: string;
      primaryText: string;
      secondaryText: string;
    };
    unselectedBox: {
      headerBg: string;
      headerPrimaryText: string;
      headerSecondaryText: string;
      bg: string;
      primaryText: string;
      secondaryText: string;
    };
    selectedBox: {
      headerBg: string;
      headerPrimaryText: string;
      headerSecondaryText: string;
      bg: string;
      primaryText: string;
      secondaryText: string;
    };
    button: {
      background: string;
      text: string;
    };
    orderSummary: {
      background: string;
      titleText: string;
      productName: string;
      priceText: string;
      labelText: string;
      borderColor: string;
    };
    footer: {
      background: string;
      primaryText: string;
      secondaryText: string;
      border: string;
    };
    securePurchase: {
      headerBackground: string;
      headerText: string;
      cardBackground: string;
      primaryText: string;
      secondaryText: string;
      linkText: string;
    };
    infoBox?: {
      background: string;
      border: string;
      text: string;
    };
  };
}

export const THEME_PRESETS: Record<'light' | 'dark', ThemePreset> = {
  light: {
    name: 'light',
    colors: {
      background: '#FFFFFF',
      primaryText: '#000000',
      secondaryText: '#6B7280',
      active: '#10B981',
      icon: '#000000',
      formBackground: '#F9FAFB',
      unselectedButton: {
        text: '#000000',
        background: '#FFFFFF',
        icon: '#000000',
      },
      selectedButton: {
        text: '#FFFFFF',
        background: '#10B981',
        icon: '#FFFFFF',
      },
      box: {
        headerBg: '#F3F4F6',
        headerPrimaryText: '#111827',
        headerSecondaryText: '#6B7280',
        bg: '#FFFFFF',
        primaryText: '#111827',
        secondaryText: '#6B7280',
      },
      unselectedBox: {
        headerBg: '#F9FAFB',
        headerPrimaryText: '#374151',
        headerSecondaryText: '#9CA3AF',
        bg: '#FFFFFF',
        primaryText: '#374151',
        secondaryText: '#9CA3AF',
      },
      selectedBox: {
        headerBg: '#10B981',
        headerPrimaryText: '#FFFFFF',
        headerSecondaryText: '#ECFDF5',
        bg: '#F0FDF4',
        primaryText: '#047857',
        secondaryText: '#059669',
      },
      button: {
        background: '#10B981',
        text: '#FFFFFF',
      },
      orderSummary: {
        background: '#F9FAFB',
        titleText: '#000000',
        productName: '#000000',
        priceText: '#000000',
        labelText: '#6B7280',
        borderColor: '#D1D5DB',
      },
      footer: {
        background: '#F9FAFB',
        primaryText: '#000000',
        secondaryText: '#6B7280',
        border: '#E5E7EB',
      },
      securePurchase: {
        headerBackground: '#10B981',
        headerText: '#FFFFFF',
        cardBackground: '#FFFFFF',
        primaryText: '#000000',
        secondaryText: '#6B7280',
        linkText: '#3B82F6',
      },
    },
  },
  dark: {
    name: 'dark',
    colors: {
      background: '#0A0A0A',
      primaryText: '#FFFFFF',
      secondaryText: '#CCCCCC',
      active: '#10B981',
      icon: '#FFFFFF',
      formBackground: '#1A1A1A',
      unselectedButton: {
        text: '#FFFFFF',
        background: '#2A2A2A',
        icon: '#FFFFFF',
      },
      selectedButton: {
        text: '#FFFFFF',
        background: '#10B981',
        icon: '#FFFFFF',
      },
      box: {
        headerBg: '#1A1A1A',
        headerPrimaryText: '#FFFFFF',
        headerSecondaryText: '#CCCCCC',
        bg: '#0A0A0A',
        primaryText: '#FFFFFF',
        secondaryText: '#CCCCCC',
      },
      unselectedBox: {
        headerBg: '#1F1F1F',
        headerPrimaryText: '#E5E5E5',
        headerSecondaryText: '#A3A3A3',
        bg: '#141414',
        primaryText: '#E5E5E5',
        secondaryText: '#A3A3A3',
      },
      selectedBox: {
        headerBg: '#10B981',
        headerPrimaryText: '#FFFFFF',
        headerSecondaryText: '#D1FAE5',
        bg: '#064E3B',
        primaryText: '#D1FAE5',
        secondaryText: '#6EE7B7',
      },
      button: {
        background: '#10B981',
        text: '#FFFFFF',
      },
      orderSummary: {
        background: '#1A1A1A',
        titleText: '#FFFFFF',
        productName: '#FFFFFF',
        priceText: '#FFFFFF',
        labelText: '#CCCCCC',
        borderColor: '#3A3A3A',
      },
      footer: {
        background: '#1A1A1A',
        primaryText: '#FFFFFF',
        secondaryText: '#CCCCCC',
        border: '#2A2A2A',
      },
      securePurchase: {
        headerBackground: '#10B981',
        headerText: '#FFFFFF',
        cardBackground: '#1A1A1A',
        primaryText: '#FFFFFF',
        secondaryText: '#CCCCCC',
        linkText: '#60A5FA',
      },
    },
  },
};

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Open Sans', label: 'Open Sans' },
];
