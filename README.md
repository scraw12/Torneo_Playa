# Torneo_Playa

// Torneo Voley Playa - Apps Script modular

/** Files
  - 00_Core.gs: sheet constants, menu, setup, configuration and players.
  - 01_Utils.gs: small reusable helpers.
  - 02_Phase1.gs: Phase 1 scheduling.
  - 03_Standings.gs: individual standings.
  - 04_FinalStage.gs: ORO/PLATA pairing and final pairs.
  - 05_Knockout.gs: knockout bracket generation.
  - 06_History.gs: tournament finalization, reset and sheet checkbox actions.
  - 07_Admin.gs: administrator authentication and protected web actions.
  - 08_WebApp.gs: public web app data and score entry.
  - Index.html: web interface.
*/
/** Important
  Keep all `.gs` files in the same Apps Script project. Apps Script loads them together, so functions can call functions from other files.
  Do not rename the sheet names inside `SHEETS` unless the spreadsheet itself is renamed.
*/
/** Administrator
  Run `configureAdministrator()` once from the Apps Script editor while logged in with the Google account that should be the administrator.
*/
