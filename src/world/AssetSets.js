import * as Flora from './Flora.js';
/** Which CC0 models each biome uses (recoloured per chapter palette). */
export const SETS = {
  common: (pal = 'soft') => Flora.qtree(['CommonTree_1', 'CommonTree_3'], 4.5, 7, pal),
  birch: (pal = 'soft') => Flora.qtree(['BirchTree_1', 'BirchTree_3'], 5, 7.5, pal),
  willow: (pal = 'meadow') => Flora.qtree(['Willow_2'], 4.5, 6.5, pal),
  pine: (pal = 'soft') => Flora.qtree(['PineTree_1', 'PineTree_3'], 5, 8, pal, Flora.umbrellaPine),
  autumn: () => Flora.qtree(['CommonTree_Autumn_1', 'CommonTree_Autumn_3', 'BirchTree_Autumn_2'], 4.5, 7, 'autumn'),
  snowPine: () => Flora.qtree(['PineTree_Snow_1', 'PineTree_Snow_3'], 5.5, 9, 'snow', Flora.umbrellaPine),
  snowBirch: () => Flora.qtree(['BirchTree_Snow_2'], 5, 7.5, 'snow'),
  dead: () => Flora.qtree(['CommonTree_Dead_2'], 4, 6, 'rust'),
  rock: (pal = 'soft') => Flora.qprop(['Rock_Moss_2', 'Rock_Moss_5', 'Rock_1', 'Rock_3'], 0.7, 1.4, pal),
  snowRock: () => Flora.qprop(['Rock_Snow_1', 'Rock_Snow_4'], 0.8, 1.6, 'snow'),
  rustRock: () => Flora.qprop(['Rock_1', 'Rock_3'], 0.8, 1.8, 'rust'),
  bush: (pal = 'soft') => Flora.qprop(['Bush_1', 'BushBerries_2'], 0.7, 1.2, pal, true, Flora.pillowMoss),
  snowBush: () => Flora.qprop(['Bush_Snow_1'], 0.7, 1.1, 'snow', false, Flora.pillowMoss),
  flowers: (pal = 'soft') => Flora.qprop(['Flowers', 'Plant_2'], 0.5, 0.9, pal, true, Flora.crookFern),
  stump: (pal = 'soft') => Flora.qprop(['TreeStump_Moss', 'WoodLog_Moss'], 0.5, 0.9, pal),
  snowStump: () => Flora.qprop(['TreeStump_Snow', 'WoodLog_Snow'], 0.5, 0.9, 'snow'),
};
