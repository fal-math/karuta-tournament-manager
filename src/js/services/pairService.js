// js/services/pairService.js
import { shuffle } from '../utils/shuffle.js';

export const pairService = {
  // 級・組ごとにグループ化
  groupByGradeAndGroup(data) {
    return data.reduce((groups, item) => {
      // 組がない場合は級だけ
      const groupKey = item["組"] ? `${item["級"]}${item["組"]}` : `${item["級"]}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
      return groups;
    }, {});
  },

  // 対戦組み合わせ生成
  generatePairs(data, shuffleFn = shuffle) {
    // 欠席/敗退を除外
    const presentMembers = data.filter(m =>
      m["欠席"] !== "TRUE" && m["敗退"] !== "TRUE"
    );

    // 勝ち上がり数が2べきになるように調整
    const numberOfWinners = this.previousPowerOfTwo(presentMembers.length);
    const numberOfMatches = presentMembers.length - numberOfWinners;

    // シャッフルして試合用と不戦勝用に分ける
    const shuffled = shuffleFn([...presentMembers]);
    const playersForMatches = shuffled.slice(0, 2 * numberOfMatches);
    const walkovers = shuffled.slice(2 * numberOfMatches).map(player => [player]);

    // pairsは [ [選手A, 選手B], [選手C, 選手D], ... ] の形式
    const pairs = Array.from({ length: numberOfMatches }, () => [null, null]);

    // 左側・右側に何人割り当てたかを記録
    let leftCount = 0;
    let rightCount = 0;

    /**
     * 指定した範囲内のpairsの右側に「異なる所属」のプレイヤーを割り当てる
     * 割り当てに成功したら割り当てたうえでtrueを返し、できなければfalseを返す
     */
    const tryAssignDifferentClubOnRight = (player, startIndex, endIndex) => {
      for (let i = startIndex; i < endIndex; i++) {
        const leftPlayer = pairs[i][0];
        if (leftPlayer && leftPlayer["所属"] !== player["所属"]) {
          pairs[i][1] = player;
          return true;
        }
      }
      return false;
    };

    /**
     * 同一所属しか空きがなかった場合の特例処理
     * 1. 既に割り当て済みの試合で、交換可能なケースがあればスワップ
     * 2. 全て不可なら同会対戦を許容
     */
    const handleSameClubMatch = (player) => {
      for (let j = 0; j < rightCount; j++) {
        const leftPlayer = pairs[j][0];
        const rightPlayer = pairs[j][1];
        if (
          leftPlayer &&
          rightPlayer &&
          player["所属"] !== leftPlayer["所属"] &&
          player["所属"] !== rightPlayer["所属"]
        ) {
          // スワップ
          pairs[j][0] = player;
          pairs[rightCount][1] = leftPlayer;
          return;
        }
      }
      // 全て同会 → 許容
      pairs[rightCount][1] = player;
    };

    /**
     * 左右バランスに応じた割り当て処理
     */
    const assignPlayer = (player) => {
      // 左側が満杯 → 右側を試す
      if (leftCount === numberOfMatches) {
        if (tryAssignDifferentClubOnRight(player, rightCount, numberOfMatches)) {
          rightCount++;
        } else {
          // 全て同一所属で割り当て不可能なら特例処理
          handleSameClubMatch(player);
          rightCount++;
        }
        return;
      }

      // 左右が同じ数 → 新規試合枠左へ
      if (leftCount === rightCount) {
        pairs[leftCount][0] = player;
        leftCount++;
        return;
      }

      // 左が多い → 右を試す
      if (tryAssignDifferentClubOnRight(player, rightCount, leftCount)) {
        rightCount++;
      } else {
        // 全部同会 → 左に追加
        pairs[leftCount][0] = player;
        leftCount++;
      }
    };

    // playersForMatchesを順に割り当て
    while (playersForMatches.length > 0) {
      const player = playersForMatches.shift();
      assignPlayer(player);
    }

    return pairs.concat(walkovers);
  },

  // n以下の最大の2の冪を返す
  previousPowerOfTwo(n) {
    if (n < 2) return 0;
    let power = 2;
    while (power < n) {
      power <<= 1;
    }
    return power >> 1;
  },
};
