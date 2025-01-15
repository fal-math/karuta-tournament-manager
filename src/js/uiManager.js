// js/uiManager.js
import { pairService } from './services/pairService.js';
import { shortenService } from './services/shortenService.js';

export const uiManager = {
  // --------------------------------
  // DOM要素取得メソッド
  // --------------------------------
  fileInput: () => document.getElementById('fileInput'),
  pasteInput: () => document.getElementById('pasteInput'),
  validateButton: () => document.getElementById('validateButton'),
  validationResult: () => document.getElementById('validationResult'),
  groupCountList: () => document.getElementById('groupCountList'),
  generateButton: () => document.getElementById('generateButton'),
  toggleAffiliationShorten: () => document.getElementById('toggleAffiliationShorten'),
  downloadImageButton: () => document.getElementById('downloadImageButton'),
  downloadCSVButton: () => document.getElementById('downloadCSVButton'),
  generationResult: () => document.getElementById('generationResult'),

  // --------------------------------
  // UI表示制御・ヘルパー
  // --------------------------------
  displayError(message) {
    this.validationResult().innerText = message;
    this.validationResult().classList.add('error');
  },

  setDisplayColumns(headers) {
    // 本来はここで "DISPLAY_COLUMNS" を決める処理などを行っても良い
    // 例:
    // if (headers.includes("姓") && headers.includes("名")) {
    //   // ...
    // } else if (headers.includes("名前")) {
    //   // ...
    // }
    // 必要に応じて実装
  },

  // クラスごとの人数を表示
  updateGroupCounts(members) {
    const groupCounts = members.reduce((counts, row) => {
      if (row["欠席"] === "TRUE" || row["敗退"] === "TRUE") return counts;
      const groupKey = row["組"] ? `${row["級"]}${row["組"]}` : `${row["級"]}`;
      counts[groupKey] = (counts[groupKey] || 0) + 1;
      return counts;
    }, {});

    const container = this.groupCountList();
    container.innerHTML = '';

    for (const groupKey in groupCounts) {
      const walkoverCounts = 2 * pairService.previousPowerOfTwo(groupCounts[groupKey]) - groupCounts[groupKey];
      const li = document.createElement('li');
      li.innerText = `${groupKey}: ${groupCounts[groupKey]}人 (不戦勝 ${walkoverCounts}人)`;
      container.appendChild(li);
    }
  },

  // --------------------------------
  // 対戦組み合わせの表示 (テーブル生成)
  // --------------------------------
  displayPairsWithGroup(pairs) {
    const resultDiv = this.generationResult();
    resultDiv.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let seatNumber = 1;

    // グループごとにペアをまとめる
    const groupedPairs = pairs.reduce((acc, pair) => {
      const key = pair.groupKey || '未設定';
      if (!acc[key]) acc[key] = [];
      acc[key].push(pair);
      return acc;
    }, {});

    // テーブルヘッダー生成用
    function createTableHeader(headers) {
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      return thead;
    }

    // プレイヤーセル生成
    function createPlayerCells(player, seatText) {
      // ルビ対応
      const nameHTML = shortenService.createRubyText(
        player["名前"] || "",
        player["名前読み"] || ""
      );
      // ID, 名前, 所属の順 (例)
      const fields = [
        { class: "seat-column", text: seatText || "" },
        { text: player["Id"] || "" },
        { text: nameHTML, isHTML: true },
        {
          class: "affiliation-cell",
          text: player["所属"] || "",
          data: player["所属"] || ""
        },
      ];
      return fields.map(({ class: c, text, isHTML, data }) => {
        const td = document.createElement('td');
        if (c) td.classList.add(c);
        if (data) td.setAttribute('data-original-affiliation', data);
        if (isHTML) {
          td.innerHTML = text; // ルビHTMLをそのまま挿入
        } else {
          td.textContent = text;
        }
        return td;
      });
    }

    // 不戦勝セル
    function createWalkoverCell() {
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.classList.add('center', 'walkover');
      cell.textContent = '不戦勝';
      return cell;
    }

    // グループごとにセクションを作る
    for (const groupKey in groupedPairs) {
      const groupPairs = groupedPairs[groupKey];

      const section = document.createElement('section');
      const div = document.createElement('div');
      div.setAttribute('class', 'tableContainer');
      section.appendChild(div);

      const title = document.createElement('h3');
      title.textContent = `${groupKey} の対戦組み合わせ`;
      div.appendChild(title);

      // テーブル作成
      const table = document.createElement('table');
      const headers = ["席", "ID", "名前", "所属", "席", "ID", "名前", "所属"];
      table.appendChild(createTableHeader(headers));

      const tbody = document.createElement('tbody');

      // グループ内のペアをテーブルに追加
      groupPairs.forEach(pair => {
        const row = document.createElement('tr');
        const player1 = pair[0];
        const player2 = pair[1] || null;

        if (!player2) {
          // 不戦勝
          createPlayerCells(player1, '').forEach(td => row.appendChild(td));
          row.appendChild(createWalkoverCell());
        } else {
          // 通常ペア
          createPlayerCells(player1, seatNumber++).forEach(td => row.appendChild(td));
          createPlayerCells(player2, seatNumber++).forEach(td => row.appendChild(td));
        }
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      div.appendChild(table);
      section.appendChild(div);
      fragment.appendChild(section);
    }

    resultDiv.appendChild(fragment);
  },

  // --------------------------------
  // 画像ダウンロード
  // --------------------------------
  downloadTableImages() {
    const tableContainers = document.querySelectorAll('.tableContainer');
    tableContainers.forEach((container, index) => {
      // overflow/heightを一時的に解除
      const originalOverflow = container.style.overflow;
      const originalHeight = container.style.height;
      container.style.overflow = 'visible';
      container.style.height = 'auto';

      setTimeout(() => {
        // html2canvasを利用
        window.html2canvas(container, { scale: 1 }).then(canvas => {
          // 元のスタイルに戻す
          container.style.overflow = originalOverflow;
          container.style.height = originalHeight;

          // 画像データを取得してダウンロード
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `table_${index + 1}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }, 300);
    });
  },

  // --------------------------------
  // CSVダウンロード
  // --------------------------------
  downloadCSV() {
    const tableContainers = document.querySelectorAll('.tableContainer table');
    let csvContent = "\uFEFF"; // BOM付き
    csvContent += "級組,席,ID,名前,所属,席,ID,名前,所属\n"; // ヘッダー行

    tableContainers.forEach(table => {
      const rows = table.querySelectorAll('tbody tr');
      const groupName = table
        .closest('.tableContainer')
        .querySelector('h3')
        .innerText
        .replace(' の対戦組み合わせ', '');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => {
          // ルビ(rb要素)がある場合は .innerText で取得
          return (cell.querySelector('rb') ?? cell).innerText.replace(/\n/g, '');
        });
        csvContent += [groupName, ...rowData].join(',') + '\n';
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '対戦組み合わせ.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
