import React, { useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { useMutation, useQuery } from 'react-apollo'
import {
  Alert,
  Button,
  Dropdown,
  Input,
  Layout,
  PageBlock,
  PageHeader,
  Spinner,
  Toggle,
} from 'vtex.styleguide'
import { useRuntime } from 'vtex.render-runtime'

import APP_SETTINGS from './graphql/appSettings.graphql'
import SAVE_SETTINGS from './graphql/saveAppSettings.graphql'
import { OMAFIT_APP_ID, OMAFIT_APP_MAJOR } from './modules/constants'
import { buildShopDomain } from './modules/shopDomain'
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type OmafitSettings,
  type SettingsIssue,
} from './modules/settings'

type SettingsQuery = {
  appSettings?: { message?: string | null } | null
}

const ISSUE_MESSAGE: Record<SettingsIssue['code'], string> = {
  'public-id': 'admin/omafit.error.publicId',
  url: 'admin/omafit.error.url',
  color: 'admin/omafit.error.color',
  radius: 'admin/omafit.error.radius',
  excluded: 'admin/omafit.error.excluded',
}

function issueFor(issues: SettingsIssue[], field: SettingsIssue['field']): SettingsIssue | undefined {
  return issues.find((issue) => issue.field === field)
}

export default function AdminOmafit() {
  const intl = useIntl()
  const { account } = useRuntime()
  const shopDomain = buildShopDomain(account)
  const { data, loading, error, refetch } = useQuery<SettingsQuery>(APP_SETTINGS, {
    variables: { app: OMAFIT_APP_ID, version: OMAFIT_APP_MAJOR },
  })
  const [save, saveState] = useMutation<{ saveAppSettings?: boolean }>(SAVE_SETTINGS)
  const [form, setForm] = useState<OmafitSettings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const loaded = !loading && !error
  useEffect(() => {
    if (!loaded || hydrated) return
    const payload = data?.appSettings?.message
    if (payload) {
      setForm(normalizeSettings(payload).settings)
    }
    setHydrated(true)
  }, [data, hydrated, loaded])

  const preview = useMemo(() => normalizeSettings(form), [form])
  const text = (id: string) => intl.formatMessage({ id })
  const fieldError = (field: SettingsIssue['field']) => {
    const issue = issueFor(preview.issues, field)
    return issue ? text(ISSUE_MESSAGE[issue.code]) : undefined
  }

  const update = (patch: Partial<OmafitSettings>) => {
    setSaved(false)
    setForm((current) => ({ ...current, ...patch }))
  }

  const canSave = hydrated && loaded && preview.issues.length === 0

  const onSave = async () => {
    if (!canSave) return
    setSaved(false)
    await save({
      variables: {
        app: OMAFIT_APP_ID,
        version: OMAFIT_APP_MAJOR,
        settings: JSON.stringify(preview.settings),
      },
    })
    setSaved(true)
    if (refetch) await refetch()
  }

  const copyDomain = async () => {
    if (!shopDomain || typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(shopDomain)
    setCopied(true)
  }

  return (
    <Layout
      pageHeader={
        <PageHeader title={text('admin/omafit.page.title')} subtitle={text('admin/omafit.page.subtitle')} />
      }
    >
      <PageBlock variation="full" title={text('admin/omafit.section.connection')}>
        {loading && !hydrated ? <Spinner /> : null}
        {error ? <Alert type="error">{text('admin/omafit.loadError')}</Alert> : null}
        <div className="mb5">
          <Input
            label={text('admin/omafit.publicId.label')}
            helpText={text('admin/omafit.publicId.help')}
            value={form.publicId}
            errorMessage={fieldError('publicId')}
            onChange={(event: { target: { value: string } }) => update({ publicId: event.target.value.trim() })}
          />
        </div>
        <div className="mb5">
          <Input label={text('admin/omafit.shopDomain.label')} value={shopDomain} readOnly helpText={text('admin/omafit.shopDomain.help')} />
          <div className="mt3">
            <Button variation="secondary" size="small" onClick={() => void copyDomain()} disabled={!shopDomain}>
              {copied ? text('admin/omafit.copied') : text('admin/omafit.copy')}
            </Button>
          </div>
        </div>
        <Alert type="warning">{text('admin/omafit.gap.body')}</Alert>
      </PageBlock>

      <PageBlock variation="full" title={text('admin/omafit.section.options')}>
        <div className="mb5">
          <Toggle
            label={text('admin/omafit.widgetEnabled.label')}
            checked={form.widgetEnabled}
            onChange={() => update({ widgetEnabled: !form.widgetEnabled })}
          />
        </div>
        <div className="mb5">
          <Input
            label={text('admin/omafit.linkText.label')}
            helpText={text('admin/omafit.linkText.help')}
            value={form.linkText}
            onChange={(event: { target: { value: string } }) => update({ linkText: event.target.value })}
          />
        </div>
        <div className="mb5">
          <Input
            label={text('admin/omafit.primaryColor.label')}
            value={form.primaryColor}
            errorMessage={fieldError('primaryColor')}
            onChange={(event: { target: { value: string } }) => update({ primaryColor: event.target.value.trim() })}
          />
        </div>
        <div className="mb5">
          <Dropdown
            label={text('admin/omafit.ctaType.label')}
            options={[
              { value: 'link', label: text('admin/omafit.ctaType.link') },
              { value: 'button', label: text('admin/omafit.ctaType.button') },
            ]}
            value={form.ctaType}
            onChange={(_event: unknown, value: string) =>
              update({ ctaType: value === 'button' ? 'button' : 'link' })
            }
          />
        </div>
        <div className="mb5">
          <Input
            label={text('admin/omafit.radius.label')}
            type="number"
            value={String(form.ctaBorderRadius)}
            errorMessage={fieldError('ctaBorderRadius')}
            onChange={(event: { target: { value: string } }) =>
              update({ ctaBorderRadius: Number(event.target.value) })
            }
          />
        </div>
        <div className="mb5">
          <Dropdown
            label={text('admin/omafit.layout.label')}
            options={[
              { value: 'default', label: text('admin/omafit.layout.default') },
              { value: 'hero', label: text('admin/omafit.layout.hero') },
              { value: 'sidebar', label: text('admin/omafit.layout.sidebar') },
            ]}
            value={form.tryonLayout}
            onChange={(_event: unknown, value: string) =>
              update({
                tryonLayout: value === 'hero' || value === 'sidebar' ? value : 'default',
              })
            }
          />
        </div>
        <div className="mb5">
          <Dropdown
            label={text('admin/omafit.entry.label')}
            helpText={text('admin/omafit.entry.help')}
            options={[
              { value: 'tryon', label: text('admin/omafit.entry.tryon') },
              { value: 'footwear-ar', label: text('admin/omafit.entry.footwear') },
            ]}
            value={form.entry}
            onChange={(_event: unknown, value: string) =>
              update({ entry: value === 'footwear-ar' ? 'footwear-ar' : 'tryon' })
            }
          />
        </div>
        <div className="mb5">
          <Dropdown
            label={text('admin/omafit.gender.label')}
            options={[
              { value: '', label: text('admin/omafit.gender.auto') },
              { value: 'female', label: text('admin/omafit.gender.female') },
              { value: 'male', label: text('admin/omafit.gender.male') },
              { value: 'unisex', label: text('admin/omafit.gender.unisex') },
            ]}
            value={form.defaultGender}
            onChange={(_event: unknown, value: string) =>
              update({
                defaultGender:
                  value === 'male' || value === 'female' || value === 'unisex' ? value : '',
              })
            }
          />
        </div>
        <div className="mb5">
          <Input
            label={text('admin/omafit.storeName.label')}
            value={form.storeName}
            onChange={(event: { target: { value: string } }) => update({ storeName: event.target.value })}
          />
        </div>
        <div className="mb5">
          <Input
            label={text('admin/omafit.excluded.label')}
            helpText={text('admin/omafit.excluded.help')}
            value={form.excludedCategories}
            onChange={(event: { target: { value: string } }) =>
              update({ excludedCategories: event.target.value })
            }
          />
        </div>
        <div className="mb5">
          <Input
            label={text('admin/omafit.baseUrl.label')}
            helpText={text('admin/omafit.baseUrl.help')}
            value={form.widgetBaseUrl}
            errorMessage={fieldError('widgetBaseUrl')}
            onChange={(event: { target: { value: string } }) =>
              update({ widgetBaseUrl: event.target.value.trim() })
            }
          />
        </div>
        {saved && !saveState.loading ? <Alert type="success">{text('admin/omafit.saved')}</Alert> : null}
        {saveState.error ? <Alert type="error">{saveState.error.message || text('admin/omafit.loadError')}</Alert> : null}
        <div className="mt5">
          <Button
            variation="primary"
            onClick={() => void onSave()}
            isLoading={saveState.loading}
            disabled={!canSave}
          >
            {text('admin/omafit.save')}
          </Button>
        </div>
      </PageBlock>
    </Layout>
  )
}
