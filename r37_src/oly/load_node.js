/* Node loader for the 奧數路線 units (tests and tools): require('./oly/load_node.js') registers all 30 units on globalThis.WQOly. */
'use strict';
require('./oly_core.js');
for (let g = 1; g <= 6; g++) require('./p' + g + '.js');
module.exports = globalThis.WQOly;
