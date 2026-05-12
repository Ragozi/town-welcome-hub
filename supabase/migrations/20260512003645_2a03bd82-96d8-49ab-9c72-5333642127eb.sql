INSERT INTO towns (slug, name, county, state, zip_codes, latitude, longitude, hero_blurb) VALUES
('saukville', 'Saukville', 'Ozaukee', 'WI', ARRAY['53080'], 43.3811, -87.9404, 'Riverside village on the Milwaukee River with classic small-town charm.'),
('fredonia', 'Fredonia', 'Ozaukee', 'WI', ARRAY['53021'], 43.4694, -87.9509, 'Quiet northern Ozaukee community surrounded by farms and forests.'),
('belgium', 'Belgium', 'Ozaukee', 'WI', ARRAY['53004'], 43.4969, -87.8403, 'Lake Michigan village with deep heritage and wide-open countryside.')
ON CONFLICT (slug) DO NOTHING;