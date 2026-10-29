-- Application ownership: Retire the external Google appointment URL in favor of conversational booking.
UPDATE site_sections
SET content_json = json_remove(content_json, '$.bookingUrl'),
    updated_at = CURRENT_TIMESTAMP
WHERE id IN ('work', 'consulting')
  AND json_extract(content_json, '$.bookingUrl') IS NOT NULL;
