/*
  # Add logo and font customization to widget configurations

  1. Changes
    - Add `storeLogo` field to modal_config JSONB to store logo URL
    - Update default modal_config to include storeLogo and expanded font options
    - This allows merchants to upload their brand logo and select custom fonts
  
  2. Notes
    - Logo URL will be stored in modal_config.storeLogo
    - Font options expanded to include: Outfit (current), Playfair Display, Raleway, Google Sans
    - Existing records will continue to work with their current configuration
*/

-- Update widget_configurations to support logo and expanded fonts
DO $$
BEGIN
  -- Update default modal_config for new records
  ALTER TABLE widget_configurations 
  ALTER COLUMN modal_config SET DEFAULT '{
    "backgroundColor": "#FFFFFF",
    "primaryColor": "#8B5CF6",
    "secondaryColor": "#06B6D4",
    "textColor": "#1F2937",
    "borderRadius": "12px",
    "fontFamily": "Outfit, sans-serif",
    "buttonStyle": "gradient",
    "showBrand": true,
    "customCSS": "",
    "storeName": "",
    "storeLogo": ""
  }'::jsonb;
END $$;