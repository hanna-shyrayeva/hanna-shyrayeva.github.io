/* ==========================================================================
   Holdings Collection — icons (inline SVG, 24 grid, 2px lines, colour = currentColor)
   Size = font-size of the element (svg is 1em). Usage: HCIcon("close", "cs-chev")
   ========================================================================== */
var HC_ICONS = {
  'pension': '<path d="M7.6524 10.8367L11.9989 12.0012L16.3455 13.1657L20.6916 14.3306C21.7436 10.4039 20.0297 6.38851 16.7441 4.35202C15.9942 3.88783 15.1801 3.53641 14.3279 3.30904C13.3497 3.04586 12.3342 2.94972 11.324 3.02467C7.61775 3.30364 4.32275 5.87826 3.30676 9.67181L7.6524 10.8367Z" stroke-width="2" stroke="currentColor"/><path d="M9 11.2572C9 11.2572 9.33929 9.17069 10.6889 7.35638C12.0385 5.54208 14.398 4 14.398 4C14.398 4 15.6753 6.52244 15.9422 8.77223C16.2091 11.022 15.4653 13 15.4653 13" stroke-width="2" stroke="currentColor"/><path d="M20.6912 14.3304L16.3447 13.1654L11.999 12.001L7.65296 10.8365L3.30687 9.672M11.999 12.001L9.52431 21M3 21H9.52431M9.52431 21H20.9981M11.3241 3.02486C12.3342 2.94962 13.3498 3.04546 14.328 3.30833C15.1802 3.53599 15.9943 3.88771 16.7442 4.35222" stroke-width="2" stroke="currentColor"/>',
  'depot': '<path d="M8.00002 7V6C8.00002 5.46957 8.21073 4.96086 8.58581 4.58579C8.96088 4.21071 9.46959 4 10 4H14C14.5305 4 15.0392 4.21071 15.4142 4.58579C15.7893 4.96086 16 5.46957 16 6V7M8.00002 7H16M21 13V19H3L3.00002 13L3.00005 7H8.00002M16 7H21V13M3.00002 13H21" stroke-width="2" stroke-linecap="square" stroke="currentColor"/>',
  'kf': '<mask id="@ID" fill="white"><path d="M12 22C9.68333 21.4167 7.77067 20.0873 6.262 18.012C4.75333 15.9367 3.99933 13.6327 4 11.1V5L12 2L20 5V11.1C20 13.6333 19.246 15.9377 17.738 18.013C16.23 20.0883 14.3173 21.4173 12 22Z"/></mask><path d="M12 22C9.68333 21.4167 7.77067 20.0873 6.262 18.012C4.75333 15.9367 3.99933 13.6327 4 11.1V5L12 2L20 5V11.1C20 13.6333 19.246 15.9377 17.738 18.013C16.23 20.0883 14.3173 21.4173 12 22Z" stroke-width="4" stroke="currentColor" mask="url(#@ID)"/>',
  'back': '<path d="M20 12H5M11 5.5L4.5 12L11 18.5" stroke="currentColor" stroke-width="2"/>',
  'chart': '<path d="M3 17L9.5 10.5L13.5 14.5L21 6.5" stroke="currentColor" stroke-width="2"/>',
  'check': '<path d="M5 12.5L10 17.5L19 6.5" stroke="currentColor" stroke-width="2"/>',
  'chevron-down': '<path d="M6.5 9.25L12 14.75L17.5 9.25" stroke="currentColor" stroke-width="2"/>',
  'chevron-up': '<path d="M6.5 14.75L12 9.25L17.5 14.75" stroke="currentColor" stroke-width="2"/>',
  'close': '<path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2"/>',
  'delete': '<path d="M4.5 7H19.5M9.5 7V4.5H14.5V7M6.5 7L7.5 19.5H16.5L17.5 7M10 11V16M14 11V16" stroke="currentColor" stroke-width="2"/>',
  'edit': '<path d="M5 19V15.4L15.2 5.2L18.8 8.8L8.6 19H5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.6 7.8L16.2 11.4" stroke="currentColor" stroke-width="2"/>',
  'info': '<mask id="@ID" fill="white"><path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"/></mask><path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke-width="4" stroke="currentColor" mask="url(#@ID)"/><path d="M12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9Z" fill="currentColor"/><path d="M11 11H13V17H11V11Z" fill="currentColor"/>',
  'more': '<path d="M12 16C13.1046 16 14 16.8954 14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16Z" fill="currentColor"/><path d="M12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z" fill="currentColor"/><path d="M12 4C13.1046 4 14 4.89543 14 6C14 7.10457 13.1046 8 12 8C10.8954 8 10 7.10457 10 6C10 4.89543 10.8954 4 12 4Z" fill="currentColor"/>',
  'plus': '<path d="M12 4V20M4 12H20" stroke="currentColor" stroke-width="2"/>',
  'search': '<circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L20.5 20.5" stroke="currentColor" stroke-width="2"/>',
  'spinner': '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.2" stroke-width="2"/><path d="M21 12C21 7.02944 16.9706 3 12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'wallet': '<path d="M3 8H21V20H3V8ZM3 8V4H17V8M15 14H18" stroke="currentColor" stroke-width="2"/>'
};
var HC_ICON_N = 0;
function HCIcon(name, cls) {
  var id = 'hcic' + (++HC_ICON_N);   /* outline icons draw an inside stroke through a mask; ids must be unique per copy */
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + HC_ICONS[name].replace(/@ID/g, id) + '</svg>';
}
