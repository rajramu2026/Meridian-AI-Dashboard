// ============================================================================
// Meridian Clinic — Staff AI Dashboard — stylized Ireland outline + county
// marker coordinates for the Locations map. This is a presentation-layer
// lookup only (pixel positions) — every number plotted on top of it (facility
// counts, no-show rates, revenue figures) is still computed live from the
// connected data source. Unknown counties (not in this table) are listed
// separately below the map rather than guessed at.
// ============================================================================

const MERIDIAN_IRELAND_VIEWBOX = "0 0 380 480";

// Simplified island silhouette (straight-line polygon, stylized not survey-accurate)
const MERIDIAN_IRELAND_PATH =
  "M210,15 L250,35 L290,60 L310,100 L305,140 L295,175 L310,205 L290,225 L305,245 " +
  "L295,285 L275,325 L235,345 L195,355 L165,375 L120,365 L75,385 L95,355 L55,330 " +
  "L80,310 L55,285 L90,270 L55,255 L40,220 L65,195 L100,205 L60,180 L35,150 L60,120 " +
  "L30,95 L65,80 L95,55 L70,45 L110,30 L150,20 L130,8 L170,5 Z";

// Approximate relative marker positions for all 32 Irish counties.
const MERIDIAN_COUNTY_COORDS = {
  Donegal: [110, 60], Derry: [190, 55], Antrim: [270, 60], Tyrone: [170, 90],
  Fermanagh: [120, 110], Armagh: [220, 110], Down: [280, 110], Monaghan: [190, 130], Cavan: [160, 150],
  Leitrim: [130, 150], Sligo: [90, 120], Mayo: [60, 160], Roscommon: [140, 190], Galway: [90, 220],
  Longford: [170, 190], Westmeath: [190, 210], Louth: [295, 155], Meath: [275, 195],
  Dublin: [300, 235], Kildare: [250, 240], Offaly: [195, 235], Laois: [205, 270],
  Wicklow: [280, 290], Wexford: [260, 330], Carlow: [240, 290], Kilkenny: [220, 310],
  Clare: [70, 255], Tipperary: [190, 290], Limerick: [110, 270], Waterford: [220, 340],
  Cork: [130, 340], Kerry: [70, 330],
};
