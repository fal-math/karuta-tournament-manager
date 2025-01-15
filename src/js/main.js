// js/main.js
import { uiManager } from './uiManager.js';
import { parseService } from './services/parseService.js';
import { pairService } from './services/pairService.js';
import { shortenService } from './services/shortenService.js';

let MEMBERS = []; 

function init() {
  // 初期化: イベントを登録
  uiManager.fileInput().addEventListener('change', onFileSelected);
  uiManager.pasteInput().addEventListener('input', onPasteInputChanged);
  uiManager.validateButton().addEventListener('click', onValidateButtonClick);
  uiManager.generateButton().addEventListener('click', onGenerateButtonClick);
  uiManager.toggleAffiliationShorten().addEventListener('change', onToggleAffiliationShorten);
  uiManager.downloadImageButton().addEventListener('click', onDownloadImageClick);
  uiManager.downloadCSVButton().addEventListener('click', onDownloadCSVClick);
}

// --------------------------------------------------
// イベントハンドラ
// --------------------------------------------------

// CSVファイルが選択されたとき
async function onFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const decodedContent = await parseService.detectEncodingAndDecode(file);
    const { headers, data } = parseService.processDecodedContent(decodedContent);
    MEMBERS = data;
    uiManager.setDisplayColumns(headers); 
    uiManager.updateGroupCounts(MEMBERS);

    uiManager.generateButton().disabled = (MEMBERS.length === 0);
  } catch (err) {
    uiManager.displayError('ファイルの読み込みまたはデコードに失敗しました。');
  }
}

// テキストエリアに入力があったとき
function onPasteInputChanged(event) {
  const content = event.target.value.trim();
  uiManager.validateButton().disabled = !content;
}

// 「貼り付けたデータの型式確認」ボタン押下
function onValidateButtonClick() {
  const content = uiManager.pasteInput().value.trim();
  if (!content) {
    MEMBERS = [];
    uiManager.generateButton().disabled = true;
    uiManager.validationResult().innerText = '入力データが不足しています';
    return;
  }

  const { headers, data } = parseService.parseData(content);
  MEMBERS = data;

  if (MEMBERS.length === 0) {
    uiManager.generateButton().disabled = true;
    return;
  }

  uiManager.setDisplayColumns(headers);
  uiManager.updateGroupCounts(MEMBERS);
  uiManager.generateButton().disabled = false;
}

// 「対戦組み合わせを生成」ボタン押下
function onGenerateButtonClick() {
  const groupedData = pairService.groupByGradeAndGroup(MEMBERS);
  let allPairs = [];

  // グループごとにペア生成
  for (const groupKey in groupedData) {
    const groupPairs = pairService.generatePairs(groupedData[groupKey]);
    // 各ペアにグループ情報を付与
    groupPairs.forEach(pair => {
      pair.groupKey = groupKey;
    });
    allPairs.push(...groupPairs);
  }

  uiManager.displayPairsWithGroup(allPairs);
  uiManager.generateButton().disabled = true;
  uiManager.downloadImageButton().disabled = false;
  uiManager.downloadCSVButton().disabled = false;
}

// 所属表示の省略チェックボックス
function onToggleAffiliationShorten() {
  const isChecked = uiManager.toggleAffiliationShorten().checked;
  shortenService.toggleAffiliationShorten(isChecked);
}

// 画像でダウンロード
function onDownloadImageClick() {
  uiManager.downloadTableImages();
}

// CSVでダウンロード
function onDownloadCSVClick() {
  uiManager.downloadCSV();
}

// アプリ開始
init();
