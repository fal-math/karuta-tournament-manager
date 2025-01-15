// js/services/parseService.js
export const parseService = {
  async detectEncodingAndDecode(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const uint8Array = new Uint8Array(e.target.result);

          // UTF-8 BOM チェック
          const hasBOM =
            uint8Array[0] === 0xef &&
            uint8Array[1] === 0xbb &&
            uint8Array[2] === 0xbf;
          if (hasBOM) {
            // BOMスキップ
            const decodedUTF8 = new TextDecoder('UTF-8').decode(
              uint8Array.slice(3)
            );
            resolve(decodedUTF8);
            return;
          }

          // Shift-JIS デコード
          const decodedShiftJIS = new TextDecoder('Shift_JIS').decode(uint8Array);
          resolve(decodedShiftJIS);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = function () {
        reject(new Error('ファイルの読み込み中にエラーが発生しました。'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  processDecodedContent(decodedContent) {
    const delimiters = ",\t ";
    return this.parseData(decodedContent, delimiters);
  },

  parseData(content, delimiters = ",\t ") {
    const rows = splitWithDelimiters(content, delimiters);
    if (rows.length === 0) {
      return { headers: [], data: [] };
    }
    const headers = rows.shift();

    const validationError = validateColumns(headers);
    if (validationError) {
      // ここではエラー時にUIに表示するのではなく、上位に返すだけ
      console.warn('Validation Error:', validationError);
      return { headers: [], data: [] };
    }

    // データ行をオブジェクト化
    const rawData = rows
      .filter(row => row.length === headers.length)
      .map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i];
        });
        return obj;
      });

    const normalizedData = normalizeData(rawData);
    return { headers, data: normalizedData };
  },
};

// -------------------------
// 内部関数
// -------------------------

function splitWithDelimiters(text, delimiters) {
  // 全角スペース等も含めたい場合に適宜拡張
  const regex = new RegExp(`[${delimiters.replace(/\s/g, '\\s')}　]`, 'g');
  return text
    .split('\n')
    .map(row => row.trim().split(regex))
    .filter(row => row.length > 0 && row.join('').trim().length > 0);
}

// 列名のバリデーション
function validateColumns(headers) {
  // 必須列 / 条件付き必須列
  const REQUIRED_COLUMNS = ['Id', '級', '所属'];
  const CONDITIONAL_REQUIRED_COLUMNS = [
    ['名前'],
    ['姓', '名'],
  ];

  // 列名を正規化
  const normalizedHeaders = headers.map(normalizeColumnName);

  // 必須列のチェック
  const missingRequired = REQUIRED_COLUMNS.filter(
    col => !normalizedHeaders.includes(normalizeColumnName(col))
  );
  if (missingRequired.length > 0) {
    return `必須列が不足しています: ${missingRequired.join(', ')}`;
  }

  // 条件付き必須(名前 or (姓, 名))のチェック
  const satisfiesConditional = CONDITIONAL_REQUIRED_COLUMNS.some(group =>
    group.every(col => normalizedHeaders.includes(normalizeColumnName(col)))
  );
  if (!satisfiesConditional) {
    return '名前 または (姓, 名) が必要です。';
  }

  return null; // OK
}

// データを正規化
function normalizeData(data) {
  return data.map(row => {
    // "名前" がない場合は "姓 + 名" を連結
    if (!row['名前'] && row['姓'] && row['名']) {
      row['名前'] = `${row['姓']} ${row['名']}`;
    }
    // "名前読み" がない場合は "姓読み + 名読み"
    if (!row['名前読み'] && row['姓読み'] && row['名読み']) {
      row['名前読み'] = `${row['姓読み']} ${row['名読み']}`;
    }
    return row;
  });
}

function normalizeColumnName(name) {
  return name
    .trim()
    .replace(/\s+/g, '')
    .replace(/　/g, '');
}
