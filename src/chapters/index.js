// Chapter registry. Chapter 1 is built directly by Game.build on start-up, but is listed here so chapter select can return to it.
import { SunkenSky } from '../world/SunkenSky.js';
import { Narrative } from '../puzzles/Narrative.js';
import { ch2 } from './Ch2.js';
import { ch3 } from './Ch3.js';
import { ch4 } from './Ch4.js';
export const CHAPTERS = { 1: { title: 'The Sunken Sky', World: SunkenSky, Narr: Narrative, ambient: null, palette: {} }, 2: ch2, 3: ch3, 4: ch4 };
