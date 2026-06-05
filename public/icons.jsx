// icons.jsx — minimal outline icon library (refined 2026-05)
// Style guide:
//  • viewBox 24×24, stroke 1.5, currentColor, round caps & joins
//  • Smooth, deliberate shapes — no decorative noise
//  • Single visual weight; let the icon read at 16–22px

const Ic = ({ name, size = 18, ...rest }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest };
  switch (name) {
    // Navigation
    case 'dashboard':return <svg {...props} style={{ height: "22px", width: "20px" }}><rect x="3.5" y="3.5" width="7" height="9" rx="2" /><rect x="13.5" y="3.5" width="7" height="5" rx="2" /><rect x="13.5" y="11.5" width="7" height="9" rx="2" /><rect x="3.5" y="15.5" width="7" height="5" rx="2" /></svg>;
    case 'inbox':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="M20.5 14.5a3.5 3.5 0 0 1-3.5 3.5H8.5L4 21v-13a3.5 3.5 0 0 1 3.5-3.5h9a3.5 3.5 0 0 1 3.5 3.5z" /><path d="M8.5 11.5h7M8.5 8h4" /></svg>;
    case 'commercial':return <svg {...props}><path d="M4 20V10M10 20V4M16 20v-7M22 20v-4" /><path d="M3 20h18" /></svg>;
    case 'megaphone':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="M3.5 10.5v3a1.5 1.5 0 0 0 1.5 1.5h2l3.5 4V5L7 9H5a1.5 1.5 0 0 0-1.5 1.5z" /><path d="M14 8a4.5 4.5 0 0 1 0 8" /><path d="M17 5.5a8 8 0 0 1 0 13" /></svg>;
    case 'finance':return <svg {...props}><path d="M3 21V9.5L12 4l9 5.5V21" /><path d="M9.5 21v-6.5h5V21" /></svg>;
    case 'contracts':return <svg {...props} style={{ width: "26px", height: "26px" }}><path d="M14 3H7a2.5 2.5 0 0 0-2.5 2.5v13A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V8.5z" /><path d="M14 3v5.5h5.5M8.5 13h7M8.5 17h4" /></svg>;
    case 'team':return <svg {...props}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.5a5 5 0 0 1 5 5" /></svg>;
    case 'leads':return <svg {...props}><path d="M3 17l5.5-5.5 3 3 7-7" /><path d="M14.5 7.5h3.5V11" /></svg>;
    case 'brand':return <svg {...props}><path d="M12 3l2.5 5.5 6 .8-4.5 4 1.2 6L12 16l-5.2 3.3 1.2-6-4.5-4 6-.8z" /></svg>;
    case 'agenda':return <svg {...props} style={{ width: "24px", height: "24px" }}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" style={{ width: "18px", height: "18px" }} /><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10.5h17" /><circle cx="8" cy="14.5" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="14.5" r=".7" fill="currentColor" stroke="none" /><circle cx="16" cy="14.5" r=".7" fill="currentColor" stroke="none" /><circle cx="8" cy="17.5" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="17.5" r=".7" fill="currentColor" stroke="none" /></svg>;
    case 'reports':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="M3.5 20.5h17" /><path d="M6.5 17.5V11M11 17.5V6.5M15.5 17.5v-4M20 17.5V9" /></svg>;
    case 'settings':return <svg {...props} style={{ width: "18px", height: "18px" }}><circle cx="12" cy="12" r="2.8" /><path d="M19.4 14.6a1.4 1.4 0 0 0 .3 1.5l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.4 1.4 0 0 0-1.5-.3 1.4 1.4 0 0 0-.9 1.3V20a1.8 1.8 0 0 1-3.6 0v-.1a1.4 1.4 0 0 0-.9-1.3 1.4 1.4 0 0 0-1.5.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.4 1.4 0 0 0 .3-1.5 1.4 1.4 0 0 0-1.3-.9H4A1.8 1.8 0 0 1 4 10.4h.1a1.4 1.4 0 0 0 1.3-.9 1.4 1.4 0 0 0-.3-1.5l-.1-.1A1.8 1.8 0 1 1 7.6 5.3l.1.1a1.4 1.4 0 0 0 1.5.3h.1a1.4 1.4 0 0 0 .8-1.3V4a1.8 1.8 0 0 1 3.6 0v.1a1.4 1.4 0 0 0 .8 1.3 1.4 1.4 0 0 0 1.5-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.4 1.4 0 0 0-.3 1.5v.1a1.4 1.4 0 0 0 1.3.8H20A1.8 1.8 0 0 1 20 13.6h-.1a1.4 1.4 0 0 0-1.3.8z" /></svg>;
    case 'bell':return <svg {...props} style={{ width: "28px", height: "28px" }}><path d="M6 10.5a6 6 0 0 1 12 0c0 4.5 2 6 2 6H4s2-1.5 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
    case 'search':return <svg {...props} style={{ width: "28px", height: "28px" }}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.5-4.5" /></svg>;
    case 'plus':return <svg {...props} style={{ width: "30px", height: "30px" }}><path d="M12 5.5v13M5.5 12h13" /></svg>;
    case 'funnel':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="M3.5 4.5h17l-6.5 8v6l-4 2.5v-8.5z" /></svg>;
    case 'filter':return <svg {...props}><circle cx="7" cy="6.5" r="2" /><circle cx="17" cy="12" r="2" /><circle cx="9" cy="17.5" r="2" /><path d="M9 6.5h11.5M3.5 6.5H5M15 12H3.5M20.5 12h-1.5M11 17.5h9.5M3.5 17.5H7" /></svg>;

    // Chevrons / arrows
    case 'chevron-left':return <svg {...props}><path d="m14 18-6-6 6-6" /></svg>;
    case 'chevron-right':return <svg {...props}><path d="m10 18 6-6-6-6" /></svg>;
    case 'chevron-down':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="m7 10 5 5 5-5" /></svg>;
    case 'chevron-up':return <svg {...props}><path d="m17 14-5-5-5 5" /></svg>;
    case 'arrow-right':return <svg {...props}><path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" /></svg>;
    case 'arrow-left':return <svg {...props}><path d="M19.5 12h-15M11 5.5 4.5 12l6.5 6.5" /></svg>;
    case 'arrow-up-right':return <svg {...props}><path d="M7 17 17 7M9 7h8v8" /></svg>;
    case 'rotate':return <svg {...props}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" /><path d="M21 4v4h-4" /><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 20v-4h4" /></svg>;

    // Channels (brand fills kept)
    case 'whatsapp':return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest} style={{ fill: "rgb(28, 215, 98)", width: size, height: size }}><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1-.8.9-.9 1.1-.3.2-.6.1-1.2-.4-2.3-1.4c-.8-.7-1.4-1.7-1.5-1.9-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.4.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3s.2-1.2.2-1.3c-.1-.2-.3-.2-.5-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3a10 10 0 1 0 5-18.7zm6 14.5a8.3 8.3 0 0 1-12.6 1l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 18 16.5z" /></svg>;
    case 'instagram':return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest} style={{ width: size, height: size }}><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="3.8" /><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" /></svg>;
    case 'facebook':return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest} style={{ width: size, height: size }}><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-2.9h2.4v-2c0-2.4 1.4-3.7 3.5-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5v1.7H16l-.4 2.9h-2.2V22A10 10 0 0 0 22 12z" /></svg>;

    // Communication
    case 'phone':return <svg {...props} style={{ width: "16px", height: "16px" }}><path d="M21.5 16.8v2.7a2 2 0 0 1-2.2 2 19.5 19.5 0 0 1-8.4-3 19.2 19.2 0 0 1-5.9-5.9 19.5 19.5 0 0 1-3-8.5A2 2 0 0 1 4 2h2.7a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L7.5 9.6a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2z" /></svg>;
    case 'mail':return <svg {...props} style={{ width: "16px", height: "16px" }}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>;
    case 'chat':return <svg {...props} style={{ width: "23px", height: "23px" }}><path d="M20.5 12a8 8 0 0 1-11.4 7.2L4 21l1.8-5.1A8 8 0 1 1 20.5 12z" /><circle cx="9" cy="12" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r=".7" fill="currentColor" stroke="none" /></svg>;
    case 'chat-plus':return <svg {...props}><path d="M20.5 11.4a8 8 0 0 1-.8 3.5 8 8 0 0 1-7.2 4.5 8 8 0 0 1-3.5-.8L4 20l1.4-5.2a8 8 0 0 1-.9-3.5A8 8 0 0 1 9 4.2a8 8 0 0 1 3.5-.8h.5a8 8 0 0 1 7.5 7.5z" /><path d="M12 8.5v6M9 11.5h6" /></svg>;

    // Composer
    case 'paperclip':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="m21 11.5-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.5-2.5l7.5-7.5" /></svg>;
    case 'mic':return <svg {...props} style={{ width: "20px", height: "20px" }}><rect x="9" y="2.5" width="6" height="11.5" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3.5M9 21h6" /></svg>;
    case 'send':return <svg {...props}><path d="M21 3 11 13M21 3l-7 18-3.5-7.5L3 10z" /></svg>;
    case 'smile':return <svg {...props} style={{ height: "18px", width: "20px" }}><circle cx="12" cy="12" r="9" /><path d="M8.5 14s1.3 2 3.5 2 3.5-2 3.5-2" /><circle cx="9" cy="10" r=".8" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r=".8" fill="currentColor" stroke="none" /></svg>;

    // Media
    case 'play':return <svg {...props} fill="currentColor" stroke="none"><path d="M6 4.5v15l13-7.5z" /></svg>;
    case 'pause':return <svg {...props}><rect x="6.5" y="4.5" width="3.5" height="15" rx="1" style={{ width: "12px" }} /><rect x="14" y="4.5" width="3.5" height="15" rx="1" style={{ width: "12px" }} /></svg>;
    case 'pause-circle':return <svg {...props} style={{ width: "18px", height: "18px" }}><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></svg>;
    case 'image':return <svg {...props}><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><circle cx="9" cy="9" r="1.8" /><path d="m20 15-5-5L4 20" /></svg>;
    case 'photo-library':return <svg {...props} style={{ width: "18px", height: "18px" }}><rect x="6.5" y="6.5" width="14" height="14" rx="2.5" /><path d="M3.5 17V6a2.5 2.5 0 0 1 2.5-2.5h11" /><circle cx="11" cy="12" r="1.4" /><path d="m20.5 17.5-3.5-3.5-6.5 6.5" /></svg>;
    case 'video':return <svg {...props}><rect x="2.5" y="6" width="13.5" height="12" rx="2.5" /><path d="m21.5 7.5-5.5 4 5.5 4z" /></svg>;
    case 'camera':return <svg {...props}><path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h2l1.5-2.5h7l1.5 2.5h2A1.5 1.5 0 0 1 20.5 7.5v11A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z" /><circle cx="12" cy="13" r="3.5" /></svg>;

    // Status
    case 'check':return <svg {...props}><path d="m20 6.5-11 11-5-5" /></svg>;
    case 'check-double':return <svg {...props}><path d="m18 6.5-9 9L4.5 11" /><path d="m22 9.5-7 7" /></svg>;
    case 'x':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    case 'circle':return <svg {...props}><circle cx="12" cy="12" r="9" /></svg>;
    case 'circle-check':return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-4.5" /></svg>;
    case 'alert':return <svg {...props}><path d="M10.5 3.6 2.6 17.4A1.7 1.7 0 0 0 4 20h16a1.7 1.7 0 0 0 1.4-2.6L13.5 3.6a1.7 1.7 0 0 0-3 0z" /><path d="M12 9v5" /><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" /></svg>;
    case 'help':return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.5 2-2.5 3" /><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" /></svg>;

    // Theme
    case 'moon':return <svg {...props}><path d="M20.5 13a8.5 8.5 0 1 1-9.5-9.5 6.5 6.5 0 0 0 9.5 9.5z" /></svg>;
    case 'sun':return <svg {...props}><circle cx="12" cy="12" r="3.8" /><path d="M12 3v2M12 19v2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M3 12h2M19 12h2M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4" /></svg>;

    // Identity / actions
    case 'logout':return <svg {...props}><path d="M9.5 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3h4M16 16.5l4.5-4.5L16 7.5M20.5 12H9" /></svg>;
    case 'sparkles':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M12 3.5 13.4 8 18 9.4 13.4 11 12 15.5 10.6 11 6 9.4 10.6 8z" /><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7zM5 14l.5 1.4 1.4.5-1.4.5L5 17.8l-.5-1.4-1.4-.5 1.4-.5z" /></svg>;
    case 'bot':return <svg {...props}><rect x="4" y="8" width="16" height="11.5" rx="3" /><path d="M12 4.5v3.5" /><circle cx="12" cy="3.5" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="13.5" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="13.5" r=".9" fill="currentColor" stroke="none" /><path d="M9.5 17h5M2.5 13v2.5M21.5 13v2.5" /></svg>;
    case 'user':return <svg {...props} style={{ width: "22px", height: "22px" }}><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></svg>;
    case 'users':return <svg {...props} style={{ width: "20px", height: "20px" }}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.5a5 5 0 0 1 5 5" /></svg>;
    case 'clock':return <svg {...props} style={{ width: "18px", height: "18px" }}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>;
    case 'history':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3l-2.8 2.6" /><path d="M3.5 3v5h5" /><path d="M12 8v4l2.5 1.5" /></svg>;
    case 'eye':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M2.5 12s4-7 9.5-7 9.5 7 9.5 7-4 7-9.5 7S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'eye-on':return <svg {...props}><path d="M2.5 12s4-7 9.5-7 9.5 7 9.5 7-4 7-9.5 7S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'eye-off':return <svg {...props}><path d="M9.9 4.2A10 10 0 0 1 21.5 12s-.9 1.6-2.6 3.3M6.6 6.6A10 10 0 0 0 2.5 12s4 7 9.5 7c1.9 0 3.6-.5 5-1.4M10 10a3 3 0 0 0 4 4" /><path d="m3.5 3.5 17 17" /></svg>;

    // Documents / items
    case 'file':return <svg {...props} style={{ width: "16px", height: "16px" }}><path d="M14 3H7a2.5 2.5 0 0 0-2.5 2.5v13A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V8.5z" /><path d="M14 3v5.5h5.5" /></svg>;
    case 'file-text':return <svg {...props} style={{ width: "22px", height: "22px" }}><path d="M14 3H7a2.5 2.5 0 0 0-2.5 2.5v13A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V8.5z" /><path d="M14 3v5.5h5.5M8.5 13h7M8.5 17h5" /></svg>;
    case 'folder':return <svg {...props}><path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5H18a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2z" /></svg>;
    case 'edit':return <svg {...props} style={{ width: "16px", height: "16px" }}><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" /><path d="M18.5 2.5a2 2 0 0 1 2.8 2.8L12 14.5l-4 1 1-4z" /></svg>;
    case 'trash':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M3.5 6.5h17M8.5 6.5V4.5A1.5 1.5 0 0 1 10 3h4a1.5 1.5 0 0 1 1.5 1.5v2M18.5 6.5 17.5 19.5A1.7 1.7 0 0 1 15.8 21H8.2a1.7 1.7 0 0 1-1.7-1.5L5.5 6.5" /><path d="M10 11v6M14 11v6" /></svg>;
    case 'tag':return <svg {...props}><path d="M20 12.5V5a2 2 0 0 0-2-2h-7.5L2.5 11l9.5 9.5 8-8z" /><circle cx="7" cy="7" r="1.3" /></svg>;
    case 'menu':return <svg {...props}><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" /></svg>;
    case 'menu-open':return <svg {...props}><path d="M3 4h18M11 8h10M3 12h18M11 16h10M3 20h18" /></svg>;
    case 'menu-closed':return <svg {...props}><path d="M3 4h18M7 8h10M3 12h18M7 16h10M3 20h18" /></svg>;
    case 'lines-3':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="M4.5 7h15M4.5 12h15M4.5 17h10" /></svg>;
    case 'more-vert':return <svg {...props} style={{ width: "22px", height: "22px" }}><circle cx="12" cy="5.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="18.5" r="1.3" fill="currentColor" stroke="none" /></svg>;
    case 'pin':return <svg {...props} style={{ width: "22px", height: "22px" }}><path d="M9 3.5h6" /><path d="M10 3.5v4l-1.5 3.5h7L14 7.5V3.5" /><path d="M12 11v9.5" /></svg>;
    case 'map-pin':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M19 10.5c0 5.2-7 11-7 11s-7-5.8-7-11a7 7 0 0 1 14 0z" /><circle cx="12" cy="10.5" r="2.6" /></svg>;
    case 'pin-off':return <svg {...props} style={{ width: "22px", height: "22px" }}><path d="M9 3.5h6" /><path d="M10 3.5v4l-1.5 3.5h7L14 7.5V3.5" /><path d="M12 11v9.5" /><path d="M3.5 3.5 20.5 20.5" /></svg>;
    case 'flag':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M4.5 21V3.5h11.5l-2 4.5 2 4.5h-11.5" /></svg>;
    case 'repeat':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M17 2.5 21 6.5l-4 4M3 12V9.5A4 4 0 0 1 7 5.5h14M7 21.5l-4-4 4-4M21 12v2.5A4 4 0 0 1 17 18.5H3" /></svg>;

    // Domain
    case 'wallet':return <svg {...props}><rect x="2.5" y="6" width="19" height="13" rx="2.5" /><path d="M16 12.5h4M2.5 9.5h19" /></svg>;
    case 'bank':return <svg {...props} style={{ width: "25px", height: "25px" }}><path d="M3 10h18L12 3.5zM6 10v8M10 10v8M14 10v8M18 10v8M3 20.5h18" /></svg>;
    case 'dollar':return <svg {...props} style={{ width: "22px", height: "22px" }}><path d="M12 3v18M16.5 7.5H10a2.8 2.8 0 0 0 0 5.5h4a2.8 2.8 0 0 1 0 5.5H7" /></svg>;
    case 'coins':return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2a2.4 2.4 0 0 0-2.5-1.7c-1.5 0-2.7.9-2.7 2.2 0 1.2 1 1.9 2.7 2.3 2 .4 3 1.1 3 2.4 0 1.3-1.2 2.2-2.8 2.2A2.6 2.6 0 0 1 9.5 15M12 5.7v1.8M12 16.5v1.8" /></svg>;
    case 'cart':return <svg {...props} style={{ width: "18px", height: "18px" }}><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2.5 3.5h2.5l3 13H20l2.5-9H6" /></svg>;
    case 'card-id':return <svg {...props}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><circle cx="9" cy="12" r="2.3" /><path d="M14 10h5M14 14h3M5.5 16c.5-1.3 1.8-2.3 3.5-2.3s3 1 3.5 2.3" /></svg>;
    case 'shield':return <svg {...props}><path d="M12 3 4 5.5v6.5c0 4.7 3.5 8.5 8 9.5 4.5-1 8-4.8 8-9.5V5.5z" /></svg>;
    case 'database':return <svg {...props}><ellipse cx="12" cy="5.5" rx="8.5" ry="2.8" /><path d="M3.5 5.5v13a8.5 2.8 0 0 0 17 0v-13M3.5 12a8.5 2.8 0 0 0 17 0" /></svg>;
    case 'activity':return <svg {...props}><path d="M22 12h-4l-3 8-6-16-3 8H2" /></svg>;
    case 'building':return <svg {...props} style={{ width: "16px", height: "16px" }}><rect x="4.5" y="2.5" width="15" height="18.5" rx="1.5" /><path d="M9.5 21v-4h5v4" /><circle cx="8" cy="6.5" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="6.5" r=".7" fill="currentColor" stroke="none" /><circle cx="16" cy="6.5" r=".7" fill="currentColor" stroke="none" /><circle cx="8" cy="10.5" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="10.5" r=".7" fill="currentColor" stroke="none" /><circle cx="16" cy="10.5" r=".7" fill="currentColor" stroke="none" /><circle cx="8" cy="14.5" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="14.5" r=".7" fill="currentColor" stroke="none" /><circle cx="16" cy="14.5" r=".7" fill="currentColor" stroke="none" /></svg>;
    case 'zap':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M13 2.5 3.5 14h8l-1 7.5 9.5-11.5h-8z" /></svg>;
    case 'list':return <svg {...props} style={{ width: "20px", height: "20px" }}><path d="M8 6.5h13M8 12h13M8 17.5h13" /><circle cx="3.5" cy="6.5" r=".9" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r=".9" fill="currentColor" stroke="none" /><circle cx="3.5" cy="17.5" r=".9" fill="currentColor" stroke="none" /></svg>;
    case 'columns':return <svg {...props}><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M9.5 3.5v17M14.5 3.5v17" /></svg>;
    case 'globe':return <svg {...props}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" /></svg>;
    case 'link':return <svg {...props}><path d="M10 13a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 1 0-6.4-6.4l-1 1" /><path d="M14 11a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 1 0 6.4 6.4l1-1" /></svg>;
    case 'lock':return <svg {...props}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>;
    case 'copy':return <svg {...props}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></svg>;
    case 'external-link':return <svg {...props}><path d="M14 4h6v6" /><path d="M11 13 20 4" /><path d="M19 13.5v5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-11A1.5 1.5 0 0 1 6.5 6h5" /></svg>;
    case 'info':return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none" /></svg>;
    case 'refresh':return <svg {...props}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" /><path d="M21 4v4h-4" /><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 20v-4h4" /></svg>;
    case 'palette':return <svg {...props}><path d="M12 3a9 9 0 1 0 9 9c0-3.6-2.7-2.7-4.5-2.7s-2.7-.9-2.7-2.7C13.8 4.7 14.4 3 12 3z" /><circle cx="7" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="9" cy="7.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="14" cy="6.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="17.5" cy="10" r="1.1" fill="currentColor" stroke="none" /></svg>;
    case 'upload':return <svg {...props}><path d="M21 15.5v3A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-3" /><path d="M17 8 12 3 7 8M12 3v12" /></svg>;
    case 'download':return <svg {...props}><path d="M21 15.5v3A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-3" /><path d="M7 11l5 5 5-5M12 3v13" /></svg>;
    case 'package':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>;
    case 'cube':return <svg {...props}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>;
    case 'star':return <svg {...props} style={{ width: "18px", height: "18px" }}><path d="M12 3l2.7 6 6.3.5-4.8 4.2 1.5 6.3L12 16.8 6.3 20l1.5-6.3L3 9.5 9.3 9z" /></svg>;
    case 'calendar':return <svg {...props} style={{ width: "16px", height: "16px" }}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10.5h17" /></svg>;
    case 'more':return <svg {...props} style={{ width: "22px", height: "22px" }}><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" /></svg>;
    case 'logo-claude':return <svg {...props}><circle cx="12" cy="12" r="8.5" /><path d="M8 9.5c.8 3.5 3 5 8 5M16 9.5c-.8 3.5-3 5-8 5" /></svg>;

    // Finance / movement
    case 'arrow-down-to-line':return <svg {...props} style={{ width: "25px", height: "25px" }}><path d="M12 3v13M6.5 10.5 12 16l5.5-5.5M4.5 20.5h15" /></svg>;
    case 'arrow-up-from-line':return <svg {...props} style={{ width: "25px", height: "25px" }}><path d="M12 21V8M6.5 13.5 12 8l5.5 5.5M4.5 3.5h15" /></svg>;
    case 'arrows-h':return <svg {...props} style={{ width: "25px", height: "25px" }}><path d="M3.5 7h17M3.5 17h17M7 3.5 3.5 7 7 10.5M17 13.5l3.5 3.5L17 20.5" /></svg>;
    case 'hash':return <svg {...props}><path d="M4 9h16M4 15h16M10 3.5 8 20.5M16 3.5l-2 17" /></svg>;

    default:return <svg {...props}><circle cx="12" cy="12" r="8.5" /></svg>;
  }
};

window.Ic = Ic;