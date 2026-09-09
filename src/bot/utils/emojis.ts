/**
 * Centralized Discord Emoji Mapping for SyncInk Voice.
 * All IDs and animation flags are pre-verified directly against Discord CDN.
 */
export const EMOJIS = {
  // Animated emojis (<a:name:id>)
  SETTINGS: '<a:settings:1547274109585588325>',
  CHECK_YES: '<a:checkyes:1547273953721057400>',
  EARTH: '<a:earth:1547273889149878465>',
  WARNING: '<a:syncwarning:1547273858329874482>',
  REFUSED: '<a:refused:1547273479567441941>',
  APPROVED: '<a:approved:1547273475914342431>',
  ALERT: '<a:sync_alert:1547274940150190080>',

  // Static emojis (<:name:id>)
  MIC: '<:mic_animation:1547274558778900611>',
  LOCKED: '<:sync_locked:1547273735059410976>',
  UNLOCKED: '<:sync_unlocked:1547273709805379734>',
  TEXT_CHANNEL: '<:text_channel:1547273653736054804>',
  SHIELD: '<:shield:1547273416569262211>',
  SHIELD_CHECK: '<:shield_check:1547273306049089576>',
  MEMBERS: '<:members:1547273123626492077>',
  HOST: '<:host:1547273018152321055>',
  SUGGESTION: '<:syncinksuggestion:1547275401456386168>',
  SFW: '<:sfw:1547275189258158080>',
  NSFW: '<:nsfw:1547275146585317436>',
  INVITE: '<:invite_people:1547275061738868746>',
  VOLUME: '<:syncvolume:1547274848877674636>',

  // Raw component emoji objects for Select Menus and Buttons
  raw: {
    mic: { id: '1547274558778900611', name: 'mic_animation' },
    settings: { id: '1547274109585588325', name: 'settings', animated: true },
    checkyes: { id: '1547273953721057400', name: 'checkyes', animated: true },
    earth: { id: '1547273889149878465', name: 'earth', animated: true },
    warning: { id: '1547273858329874482', name: 'syncwarning', animated: true },
    locked: { id: '1547273735059410976', name: 'sync_locked' },
    unlocked: { id: '1547273709805379734', name: 'sync_unlocked' },
    text: { id: '1547273653736054804', name: 'text_channel' },
    refused: { id: '1547273479567441941', name: 'refused', animated: true },
    approved: { id: '1547273475914342431', name: 'approved', animated: true },
    shield: { id: '1547273416569262211', name: 'shield' },
    shieldCheck: { id: '1547273306049089576', name: 'shield_check' },
    members: { id: '1547273123626492077', name: 'members' },
    host: { id: '1547273018152321055', name: 'host' },
    suggestion: { id: '1547275401456386168', name: 'syncinksuggestion' },
    sfw: { id: '1547275189258158080', name: 'sfw' },
    nsfw: { id: '1547275146585317436', name: 'nsfw' },
    invite: { id: '1547275061738868746', name: 'invite_people' },
    alert: { id: '1547274940150190080', name: 'sync_alert', animated: true },
    volume: { id: '1547274848877674636', name: 'syncvolume' },
  },
} as const;
