// js/services/shortenService.js

export const shortenService = {
  // 所属を短縮する
  shortenAffiliation(affiliation, length = 5) {
    if (!affiliation) return '';
    return affiliation.length > length+1
      ? affiliation.slice(0, length) + '…'
      : affiliation;
  },

  // 名前 + ふりがなを <ruby> 形式にする
  createRubyText(name, furigana) {
    if (!furigana) return name;
    return `<ruby><rb>${name}</rb><rp>(</rp><rt>${furigana}</rt><rp>)</rp></ruby>`;
  },

  // チェックボックスの切り替えで短縮を適用する
  toggleAffiliationShorten(isChecked) {
    const affiliationCells = document.querySelectorAll('td.affiliation-cell');
    affiliationCells.forEach(cell => {
      const original = cell.getAttribute('data-original-affiliation') || '';
      cell.textContent = isChecked
        ? this.shortenAffiliation(original)
        : original;
    });
  }
};
