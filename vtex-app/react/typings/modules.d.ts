declare module '*.graphql' {
  const query: unknown
  export default query
}

declare module 'react-intl' {
  import type { ReactElement } from 'react'

  export function useIntl(): {
    formatMessage: (
      descriptor: { id: string; defaultMessage?: string },
      values?: Record<string, string | number>
    ) => string
  }

  export function FormattedMessage(props: {
    id: string
    defaultMessage?: string
  }): ReactElement | null
}

declare module 'react-apollo' {
  export function useQuery<T>(
    query: unknown,
    options?: { variables?: Record<string, unknown>; ssr?: boolean }
  ): {
    data?: T
    loading: boolean
    error?: { message?: string }
    refetch?: () => Promise<unknown>
  }

  export function useMutation<T>(
    mutation: unknown
  ): [
    (options: { variables: Record<string, unknown> }) => Promise<{ data?: T }>,
    { loading: boolean; error?: { message?: string } },
  ]
}

declare module 'vtex.render-runtime' {
  export const canUseDOM: boolean

  export function useRuntime(): {
    account?: string
    culture?: { locale?: string }
    hints?: { mobile?: boolean }
    getSettings?: (app: string) => unknown
  }
}

declare module 'vtex.css-handles' {
  export function useCssHandles<T extends readonly string[]>(
    handles: T
  ): { handles: Record<T[number], string> }
}

declare module 'vtex.order-items/OrderItems' {
  export function useOrderItems(): {
    addItems: (
      items: Array<{ id: string; quantity: number; seller: string }>
    ) => Promise<unknown>
  }
}

declare module 'vtex.product-context' {
  export interface VtexImage {
    imageUrl?: string
  }

  export interface VtexVariation {
    name?: string
    values?: string[]
  }

  export interface VtexSeller {
    sellerId?: string
    sellerDefault?: boolean
    commertialOffer?: {
      AvailableQuantity?: number
      Price?: number
    }
  }

  export interface VtexSku {
    itemId?: string
    name?: string
    images?: VtexImage[]
    variations?: VtexVariation[]
    sellers?: VtexSeller[]
  }

  export interface VtexCategory {
    id?: string | number
    name?: string
  }

  export interface VtexProduct {
    productId?: string
    productName?: string
    description?: string
    linkText?: string
    categoryId?: string
    categories?: string[]
    categoryTree?: VtexCategory[]
    items?: VtexSku[]
  }

  export function useProduct():
    | {
        product?: VtexProduct | null
        selectedItem?: VtexSku | null
      }
    | undefined
}

declare module 'vtex.styleguide' {
  import type { ComponentType, ReactNode } from 'react'

  type Loose = Record<string, unknown>

  export const Layout: ComponentType<{ children?: ReactNode; pageHeader?: ReactNode }>
  export const PageHeader: ComponentType<{ title?: ReactNode; subtitle?: ReactNode }>
  export const PageBlock: ComponentType<{
    variation?: string
    title?: ReactNode
    subtitle?: ReactNode
    children?: ReactNode
  }>
  export const Input: ComponentType<Loose>
  export const Button: ComponentType<Loose>
  export const Toggle: ComponentType<Loose>
  export const Alert: ComponentType<{ type?: string; children?: ReactNode }>
  export const Spinner: ComponentType<{ size?: number }>
  export const Dropdown: ComponentType<Loose>
}
