-- Expand carrier identities only; no credentials, live carrier, tariff or shipment is seeded.
ALTER TABLE bazar.addresses DROP CONSTRAINT addresses_carrier_check;
ALTER TABLE bazar.addresses ADD CONSTRAINT addresses_carrier_check CHECK(carrier IN ('nova-poshta','meest','ukrposhta'));
ALTER TABLE bazar.delivery_quotes DROP CONSTRAINT delivery_quotes_carrier_check;
ALTER TABLE bazar.delivery_quotes ADD CONSTRAINT delivery_quotes_carrier_check CHECK(carrier IN ('nova-poshta','meest','ukrposhta'));
ALTER TABLE bazar.shipments DROP CONSTRAINT shipments_carrier_check;
ALTER TABLE bazar.shipments ADD CONSTRAINT shipments_carrier_check CHECK(carrier IN ('nova-poshta','meest','ukrposhta'));
ALTER TABLE bazar.order_checkout_snapshots DROP CONSTRAINT order_checkout_snapshots_carrier_check;
ALTER TABLE bazar.order_checkout_snapshots ADD CONSTRAINT order_checkout_snapshots_carrier_check CHECK(carrier IN ('nova-poshta','meest','ukrposhta'));
ALTER TABLE bazar.shipping_carriers DROP CONSTRAINT shipping_carriers_code_check;
ALTER TABLE bazar.shipping_carriers ADD CONSTRAINT shipping_carriers_code_check CHECK(code IN ('nova-poshta','meest','ukrposhta'));
