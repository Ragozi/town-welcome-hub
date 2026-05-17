
-- Seed the 7-county SE Wisconsin region.
-- Counties: Ozaukee (additions only), Waukesha, Milwaukee, Washington,
-- Racine, Kenosha, Walworth.
--
-- Each town is one row representing a service area. zip_codes is the
-- primary residential zip(s) for that municipality — additional zips can
-- be added through the admin UI as needed. Coordinates are the
-- approximate municipal center, used by the nearest_town RPC.
--
-- Hero blurbs are short placeholders — Lovable's admin UI can edit them.

INSERT INTO public.towns (slug, name, county, state, zip_codes, latitude, longitude, hero_blurb) VALUES
  -- Ozaukee County (additions to existing Saukville/Fredonia/Belgium)
  ('cedarburg',        'Cedarburg',        'Ozaukee',   'WI', ARRAY['53012'],          43.2967, -87.9876, 'Historic mill town with a walkable downtown and year-round festivals.'),
  ('grafton',          'Grafton',          'Ozaukee',   'WI', ARRAY['53024'],          43.3197, -87.9534, 'Milwaukee River village blending small-town feel with easy I-43 access.'),
  ('mequon',           'Mequon',           'Ozaukee',   'WI', ARRAY['53092','53097'],  43.2289, -87.9982, 'Spacious bedroom community along Lake Michigan and the Milwaukee River.'),
  ('port-washington',  'Port Washington',  'Ozaukee',   'WI', ARRAY['53074'],          43.3872, -87.8728, 'Lake Michigan harbor town with a lighthouse, marina, and farmers market.'),
  ('thiensville',      'Thiensville',      'Ozaukee',   'WI', ARRAY['53092'],          43.2378, -87.9809, 'Tiny village surrounded by Mequon, known for its riverfront park.'),
  -- Waukesha County
  ('brookfield',       'Brookfield',       'Waukesha',  'WI', ARRAY['53005','53045'],  43.0606, -88.1064, 'Major retail and business hub west of Milwaukee.'),
  ('pewaukee',         'Pewaukee',         'Waukesha',  'WI', ARRAY['53072'],          43.0808, -88.2612, 'Lakefront town centered on Pewaukee Lake.'),
  ('waukesha',         'Waukesha',         'Waukesha',  'WI', ARRAY['53186','53188','53189'], 43.0117, -88.2315, 'County seat with a vibrant historic downtown.'),
  ('delafield',        'Delafield',        'Waukesha',  'WI', ARRAY['53018'],          43.0608, -88.4040, 'Lake Country gem with boutique shops and Nagawicka Lake.'),
  ('hartland',         'Hartland',         'Waukesha',  'WI', ARRAY['53029'],          43.1042, -88.3434, 'Lake Country village near Pine and Nagawicka lakes.'),
  ('menomonee-falls',  'Menomonee Falls',  'Waukesha',  'WI', ARRAY['53051'],          43.1789, -88.1170, 'Growing northwest suburb with strong schools and parks.'),
  ('sussex',           'Sussex',           'Waukesha',  'WI', ARRAY['53089'],          43.1342, -88.2226, 'Quiet residential village near Sussex Mill Park.'),
  ('oconomowoc',       'Oconomowoc',       'Waukesha',  'WI', ARRAY['53066'],          43.1117, -88.5004, 'Lake town with a charming downtown and three lakes in walking distance.'),
  ('mukwonago',        'Mukwonago',        'Waukesha',  'WI', ARRAY['53149'],          42.8678, -88.3329, 'Small town surrounded by lakes, parks, and the Vernon Marsh.'),
  ('new-berlin',       'New Berlin',       'Waukesha',  'WI', ARRAY['53146','53151'],  42.9747, -88.1085, 'Spread-out suburb between Milwaukee and Waukesha.'),
  ('elm-grove',        'Elm Grove',        'Waukesha',  'WI', ARRAY['53122'],          43.0428, -88.0823, 'Compact village with tree-lined streets and top schools.'),
  -- Milwaukee County
  ('milwaukee',        'Milwaukee',        'Milwaukee', 'WI', ARRAY['53202','53203','53204','53205','53206','53207','53208','53209','53210','53211','53212','53213','53214','53215','53216','53217','53218','53219','53220','53221','53222','53223','53224','53225','53226','53227','53228','53233','53235'], 43.0389, -87.9065, 'Wisconsin''s largest city — Lake Michigan, breweries, and Brewers baseball.'),
  ('wauwatosa',        'Wauwatosa',        'Milwaukee', 'WI', ARRAY['53213','53222','53226'], 43.0494, -88.0075, 'Urban village with a thriving downtown and Hart Park.'),
  ('west-allis',       'West Allis',       'Milwaukee', 'WI', ARRAY['53214','53219','53227'], 43.0167, -88.0070, 'Dense streetcar suburb home to the WI State Fair.'),
  ('greenfield',       'Greenfield',       'Milwaukee', 'WI', ARRAY['53220','53221','53228'], 42.9614, -88.0126, 'Family-friendly suburb with parks and shopping along 27th St.'),
  ('oak-creek',        'Oak Creek',        'Milwaukee', 'WI', ARRAY['53154'],          42.8856, -87.8631, 'Lake Michigan suburb with rapidly growing retail along I-94.'),
  ('franklin',         'Franklin',         'Milwaukee', 'WI', ARRAY['53132'],          42.8889, -88.0046, 'Southern suburb with parks, the Rock complex, and Whitnall Park.'),
  ('brown-deer',       'Brown Deer',       'Milwaukee', 'WI', ARRAY['53223'],          43.1739, -87.9923, 'North-shore village with golf, parks, and quiet neighborhoods.'),
  ('whitefish-bay',    'Whitefish Bay',    'Milwaukee', 'WI', ARRAY['53217'],          43.1067, -87.9001, 'Walkable lakefront village with top-rated schools.'),
  ('shorewood',        'Shorewood',        'Milwaukee', 'WI', ARRAY['53211'],          43.0892, -87.8870, 'Urban-suburban village on Lake Michigan adjacent to UWM.'),
  ('glendale',         'Glendale',         'Milwaukee', 'WI', ARRAY['53209','53217'],  43.1281, -87.9389, 'North-shore city with Bayshore Town Center and Lincoln Park.'),
  ('bayside',          'Bayside',          'Milwaukee', 'WI', ARRAY['53217'],          43.1817, -87.9020, 'Tiny lakefront village known for its bird sanctuary and tree-lined streets.'),
  ('fox-point',        'Fox Point',        'Milwaukee', 'WI', ARRAY['53217'],          43.1525, -87.9034, 'Quiet residential village between Whitefish Bay and Bayside.'),
  ('greendale',        'Greendale',        'Milwaukee', 'WI', ARRAY['53129'],          42.9406, -88.0034, 'Planned village with a historic original town center.'),
  ('hales-corners',    'Hales Corners',    'Milwaukee', 'WI', ARRAY['53130'],          42.9389, -88.0501, 'Compact southwest suburb anchored by the Boerner Botanical Gardens area.'),
  ('south-milwaukee',  'South Milwaukee',  'Milwaukee', 'WI', ARRAY['53172'],          42.9106, -87.8606, 'Lake Michigan city with Grant Park and historic downtown.'),
  ('cudahy',           'Cudahy',           'Milwaukee', 'WI', ARRAY['53110'],          42.9586, -87.8617, 'Lakeside suburb between St. Francis and South Milwaukee.'),
  ('st-francis',       'St. Francis',      'Milwaukee', 'WI', ARRAY['53235'],          42.9728, -87.8859, 'Small Lake Michigan city neighboring Milwaukee''s south side.'),
  -- Washington County
  ('west-bend',        'West Bend',        'Washington','WI', ARRAY['53090','53095'],  43.4253, -88.1834, 'County seat on the Milwaukee River with a vibrant downtown.'),
  ('hartford',         'Hartford',         'Washington','WI', ARRAY['53027'],          43.3186, -88.3787, 'Small city on the Rubicon River with an automotive heritage.'),
  ('germantown',       'Germantown',       'Washington','WI', ARRAY['53022'],          43.2286, -88.1101, 'Growing village between Menomonee Falls and West Bend.'),
  ('jackson',          'Jackson',          'Washington','WI', ARRAY['53037'],          43.3208, -88.1668, 'Small village along Hwy 60 north of Germantown.'),
  ('slinger',          'Slinger',          'Washington','WI', ARRAY['53086'],          43.3328, -88.2843, 'Village known for the Slinger Super Speedway.'),
  ('richfield',        'Richfield',        'Washington','WI', ARRAY['53076'],          43.2453, -88.2576, 'Rural community with Holy Hill nearby.'),
  ('kewaskum',         'Kewaskum',         'Washington','WI', ARRAY['53040'],          43.5217, -88.2287, 'Northern Washington County village near the Kettle Moraine.'),
  -- Racine County
  ('racine',           'Racine',           'Racine',    'WI', ARRAY['53402','53403','53404','53405','53406'], 42.7261, -87.7829, 'Lake Michigan city with Wind Point lighthouse and SC Johnson HQ.'),
  ('caledonia',        'Caledonia',        'Racine',    'WI', ARRAY['53108','53126','53402'], 42.8014, -87.8784, 'Spread-out village north of Racine.'),
  ('mount-pleasant',   'Mount Pleasant',   'Racine',    'WI', ARRAY['53406','53177'],  42.7050, -87.8918, 'Fast-growing village home to Foxconn campus and Microsoft data center.'),
  ('sturtevant',       'Sturtevant',       'Racine',    'WI', ARRAY['53177'],          42.6975, -87.8951, 'Compact village along the Hiawatha Amtrak line.'),
  ('union-grove',      'Union Grove',      'Racine',    'WI', ARRAY['53182'],          42.6864, -88.0512, 'Small village west of I-94 with parks and farmland nearby.'),
  ('burlington',       'Burlington',       'Racine',    'WI', ARRAY['53105'],          42.6781, -88.2762, 'Chocolate City on the Fox River with a historic downtown.'),
  ('waterford',        'Waterford',        'Racine',    'WI', ARRAY['53185'],          42.7611, -88.2129, 'Village along the Fox River with lake access nearby.'),
  -- Kenosha County
  ('kenosha',          'Kenosha',          'Kenosha',   'WI', ARRAY['53140','53142','53143','53144'], 42.5847, -87.8212, 'Lake Michigan city with HarborPark, museums, and a vintage streetcar.'),
  ('pleasant-prairie', 'Pleasant Prairie', 'Kenosha',   'WI', ARRAY['53158'],          42.5494, -87.9265, 'Village with Pringle Lake, RecPlex, and the Premium Outlets.'),
  ('somers',           'Somers',           'Kenosha',   'WI', ARRAY['53171'],          42.6433, -87.8754, 'Village home to UW-Parkside.'),
  ('twin-lakes',       'Twin Lakes',       'Kenosha',   'WI', ARRAY['53181'],          42.5253, -88.2462, 'Lake village in southwest Kenosha County.'),
  ('silver-lake',      'Silver Lake',      'Kenosha',   'WI', ARRAY['53170'],          42.5483, -88.1623, 'Small lakeside village near Twin Lakes.'),
  ('paddock-lake',     'Paddock Lake',     'Kenosha',   'WI', ARRAY['53168'],          42.5731, -88.1057, 'Quiet village built around its namesake lake.'),
  ('bristol',          'Bristol',          'Kenosha',   'WI', ARRAY['53104'],          42.5494, -88.0479, 'Rural village home to the Bristol Renaissance Faire.'),
  -- Walworth County
  ('lake-geneva',      'Lake Geneva',      'Walworth',  'WI', ARRAY['53147'],          42.5917, -88.4334, 'Resort town on Geneva Lake known for shore paths and lakefront mansions.'),
  ('elkhorn',          'Elkhorn',          'Walworth',  'WI', ARRAY['53121'],          42.6731, -88.5443, 'County seat with a historic square and county fairgrounds.'),
  ('whitewater',       'Whitewater',       'Walworth',  'WI', ARRAY['53190'],          42.8336, -88.7323, 'College town home to UW-Whitewater.'),
  ('delavan',          'Delavan',          'Walworth',  'WI', ARRAY['53115'],          42.6275, -88.6448, 'Lake city with a circus heritage and Lake Lawn Resort nearby.'),
  ('williams-bay',     'Williams Bay',     'Walworth',  'WI', ARRAY['53191'],          42.5781, -88.5418, 'Geneva Lake village home to Yerkes Observatory.'),
  ('fontana',          'Fontana-on-Geneva Lake', 'Walworth', 'WI', ARRAY['53125'],     42.5453, -88.5743, 'Geneva Lake resort village with a public beach and harbor.'),
  ('east-troy',        'East Troy',        'Walworth',  'WI', ARRAY['53120'],          42.7864, -88.4040, 'Village along the East Troy Railroad with a charming square.'),
  ('walworth',         'Walworth',         'Walworth',  'WI', ARRAY['53184'],          42.5311, -88.5984, 'Small village near the Illinois border.'),
  ('genoa-city',       'Genoa City',       'Walworth',  'WI', ARRAY['53128'],          42.4978, -88.3270, 'Village straddling the Wisconsin-Illinois border.')
ON CONFLICT (slug) DO NOTHING;
