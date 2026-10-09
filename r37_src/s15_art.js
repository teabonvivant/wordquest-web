const R37_ART={
 '🔤':'<path fill="#fff7df" d="M12 16h40v38H12z"/><path fill="#8bcaff" d="M32 16h20v38H32z"/><path d="m18 42 7-18 7 18m-12-5h10m8-11h6a5 5 0 0 1 0 10h-6m0-10v18h7a4 4 0 0 0 0-8"/>',
 '🔢':'<rect x="14" y="8" width="36" height="48" rx="9" fill="#effff5"/><rect x="21" y="15" width="22" height="10" rx="3" fill="#81e8ba"/><path d="M22 36h8m-4-4v8m10-4h7m-20 11h7m6-2h7m-7 5h7"/>',
 '🧩':'<path fill="#dec9ff" d="M12 14h14c-4-10 16-10 12 0h14v14c-10-4-10 16 0 12v12H38c4-10-16-10-12 0H12V38c10 4 10-16 0-12z"/>',
 '🎮':'<path fill="#f5efff" d="M19 19h26c9 0 15 27 10 31-5 4-13-7-16-7H25c-3 0-11 11-16 7-5-4 1-31 10-31z"/><path d="M17 30h12m-6-6v12"/><circle cx="42" cy="28" r="3" fill="#ff879d" stroke="none"/><circle cx="49" cy="35" r="3" fill="#70cfca" stroke="none"/>',
 '✏️':'<path fill="#fff8e5" d="M10 12h31v44H10z"/><path d="M17 22h17m-17 8h10m-10 8h8"/><path fill="#ffd366" d="m28 43 20-30 9 6-20 30-12 5z"/><path fill="#ff92b4" d="m48 13 3-5 9 6-3 5z"/>',
 '👪':'<circle cx="21" cy="19" r="8" fill="#ffcb94"/><circle cx="43" cy="19" r="8" fill="#ffe2bd"/><path fill="#9bccff" d="M8 49V37c0-14 26-14 26 0v12z"/><path fill="#cab5ff" d="M30 49V37c0-14 26-14 26 0v12z"/><circle cx="32" cy="36" r="7" fill="#ffe2bd"/><path fill="#ffe183" d="M21 56V49c0-11 22-11 22 0v7z"/>',
 '🪐':'<circle cx="32" cy="31" r="19" fill="#a5d9ff"/><path d="M18 20c9 4 19 4 27 0M15 31c10 5 25 5 34 0" stroke="#65acdb"/><ellipse cx="32" cy="34" rx="30" ry="8" transform="rotate(-24 32 34)" fill="none" stroke="#ffe39a" stroke-width="5"/>',
 '🏆':'<path fill="#ffd66b" d="M20 10h24v18c0 20-24 20-24 0z"/><path d="M20 15H9v8c0 8 6 12 13 12m22-20h11v8c0 8-6 12-13 12M32 43v10m-12 3h24"/><path d="m32 16 2 5 6 1-5 4 2 6-5-3-5 3 2-6-5-4 6-1z" fill="#fff9dc" stroke="none"/>',
 '🎯':'<circle cx="30" cy="34" r="23" fill="#fff0ed"/><circle cx="30" cy="34" r="15" fill="#ff8c9d"/><circle cx="30" cy="34" r="6" fill="#fff0ed"/><path d="m30 34 23-23m-6-5v11h11"/>',
 '🕹️':'<path fill="#bdb6ff" d="m9 40 12-9h22l12 9v15H9z"/><path d="M10 41h44M30 35V19"/><circle cx="30" cy="13" r="9" fill="#ff8fa7"/><circle cx="43" cy="38" r="4" fill="#ffe38c"/>',
 '🏃':'<circle cx="39" cy="11" r="7" fill="#ffdab3"/><path d="m30 23 10 3 8 9m-18-12-9 14 13 6-8 14m4-22 13 12 11 1M22 26l-9 7H5" stroke="#24466b" stroke-width="7"/><path d="m30 23-8 12 12 8 7-14z" fill="#8aead1"/>',
 '✅':'<rect x="10" y="10" width="44" height="44" rx="12" fill="#bcf4d6"/><path d="m20 32 9 9 17-19" stroke="#24654b" stroke-width="5"/>',
 '🔊':'<path fill="#a9d8ff" d="M9 25h12l14-12v38L21 39H9z"/><path d="M43 23c6 5 6 13 0 18m7-26c12 10 12 24 0 34"/>',
 '📚':'<path fill="#a5d9ff" d="M10 15h12v40H10z"/><path fill="#cdbbff" d="M23 9h13v46H23z"/><path fill="#ffd882" d="m37 17 12-3 9 38-12 3z"/><path d="M13 23h6m7-5h7m-20 28h6m7 0h7"/>'
};
R37_ART['✍️']=R37_ART['✏️'];
R37_ART['📖']=R37_ART['🔤'];
const R37_WORD_ART={
 aim:R37_ART['🎯'],
 hen:'<path fill="#fff8e5" d="M17 31 9 21l-3 17c0 15 14 19 29 16 12-2 17-13 12-21V20H33v13z"/><path fill="#ff7c83" d="M32 20c-8-8 1-15 5-9 4-10 14-4 9 4 8 0 9 9 0 9"/><path fill="#ffd36d" d="m47 24 12 7-12 3z"/><circle cx="40" cy="28" r="2" fill="#273559" stroke="none"/><path d="M25 53v7m13-8v8M18 36c-1 12 15 12 16 2"/>',
 nut:'<path fill="#bb7745" d="M32 10c21 0 27 31 11 42-6 5-16 5-22 0C5 41 11 10 32 10z"/><path fill="#e7b16d" d="M32 10c13 0 17 31 7 42-4 4-10 4-14 0-10-11-6-42 7-42z"/><path d="M19 16c7-5 19-5 26 0M32 18v30"/>',
 dog:'<path fill="#cd925f" d="m17 13-13 9 4 27 13-12m26-24 13 9-4 27-13-12"/><path fill="#ffdbab" d="M15 19c0-14 34-14 34 0v22c0 22-34 22-34 0z"/><circle cx="24" cy="29" r="3" fill="#273559" stroke="none"/><circle cx="40" cy="29" r="3" fill="#273559" stroke="none"/><path fill="#273559" d="m26 38 6 6 6-6z"/><path d="M32 44v6m-7-1c4 5 10 5 14 0"/>',
 turnip:'<path fill="#78ca85" d="M31 25C12 23 13 5 17 6c7 1 13 9 14 19C27 4 42 0 43 6c0 8-7 16-12 19z"/><path fill="#fff5ed" d="M14 33c0-18 37-18 37 0 0 16-19 19-19 28-1-9-18-12-18-28z"/><path fill="#bda0dc" d="M14 33c0-18 37-18 37 0-11 8-26 8-37 0z"/>',
 cauliflower:'<path fill="#7bc993" d="M31 56C7 53 4 32 10 28l21 14 23-14c6 15-4 27-23 28z"/><path fill="#fff8e7" d="M18 43C3 40 7 24 16 23c-4-13 10-20 17-12 10-9 24 1 20 12 12 6 9 22-4 23z"/><path d="M20 24c5-7 14-4 13 4m2 9c1-9 12-11 16-3M31 45v11"/>'
};
function r37Svg(body){return `<svg class="r37-svg" viewBox="0 0 64 64" fill="none" stroke="#273559" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;}
function r37Icon(icon){return R37_ART[icon]?r37Svg(R37_ART[icon]):esc(icon);}
function r37WordArt(word){return R37_WORD_ART[word]?r37Svg(R37_WORD_ART[word]):esc(r37Emoji(word)||'🔊');}
