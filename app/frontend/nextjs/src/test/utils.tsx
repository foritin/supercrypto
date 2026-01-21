import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/test/mocks/i18n'

// Wrapper component with all providers
// Note: Ant Design ConfigProvider has been removed as part of shadcn/ui migration
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  )
}

// Custom render function that includes providers
function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render with custom render
export { customRender as render }

