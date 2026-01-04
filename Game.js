const RANK_VALUES = { 'K': 8, 'Q': 7, 'J': 6, 'A': 5, '10': 4, '9': 3, '8': 2, '7': 1 };
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    }
    get isRed() { return this.suit === 'hearts' || this.suit === 'diamonds'; }
    toString() { return this.symbols[this.suit] + this.rank; }
}

class Deck {
    constructor() {
        this.cards = [];
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['K', 'Q', 'J', 'A', '10', '9', '8', '7'];
        for (let s of suits) {
            for (let r of ranks) { this.cards.push(new Card(s, r)); }
        }
    }
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const r = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[r]] = [this.cards[r], this.cards[i]];
        }
    }
    draw() { return this.cards.pop(); }
}

class EcarteGame {

    constructor() {
        this.deck;
        this.playerHand = [];
        this.cpuHand = [];
        this.trumpCard = null;
        this.trumpSuit = null;
        this.phaseState = null;//現在どのラウンドかを示す　'startRound'か'exchangeRound'か'playRound'
        this.playerPlayedCard = null;
        this.cpuPlayedCard = null;
        this.leadSuit = null; // 最初に場に出されたスート
        this.tricksWon = { player: 0, cpu: 0 };// 今回の「ラウンド」内での勝ち数（0〜5）
        this.gameScore = { player: 0, cpu: 0 };// ゲーム全体の累計スコア（先に5点取ったら優勝）
        this.Dealer = null;// どちらがディーラーか ('player' or 'cpu') 
        this.wasExchanged = false; // 交換が行われたかどうかのフラグ
        this.exchangeRefuser = '';//初回の交換をしないあるいは拒否したプレイヤー''または'player' または 'cpu'
        this.proposer = null; // どちらが交換を提案したか ('player' or 'cpu')
        this.currentPlayer = null; //最後にカードを出したプレイヤー　 'player' または 'cpu'
    }

    startRound() {
        this.deck = new Deck();
        this.deck.shuffle();
        this.playerHand = [];
        this.cpuHand = [];
        this.tricksWon = { player: 0, cpu: 0 };
        this.playerPlayedCard = null;
        this.cpuPlayedCard = null;
        this.leadSuit = null; // 最初に場に出されたスート
        this.phaseState = 'startRound';
        this.wasExchanged = false; // 新しいディールごとにリセット
        this.exchangeRefuser = '';// 新しいディールごとにリセット
        this.updateTrickDots(); //勝利数を示すドットをリセット
        // 1. まず「前回のディーラー」を確認して、今回のディーラーを確定させる
        if (this.Dealer === null) {
            // 本当に最初の1回目だけランダム
            this.Dealer = (Math.random() < 0.5) ? 'player' : 'cpu';
            console.log("初回ランダム抽選:", this.Dealer);
        }
        else {
            // 2回目以降は、前回の値を反転させる（交互）
            this.Dealer = (this.Dealer === 'player') ? 'cpu' : 'player';
            console.log("ディーラー交代:", this.Dealer);
        }
        // 2. ディーラーが決まった「後」で、リードプレイヤーを決定する
        // エカルテのルール：ディーラーではない方（ノンディーラー）がリード
        this.currentPlayer = (this.Dealer === 'player') ? 'cpu' : 'player';
        // ログに表示（デバッグ用）
        const dealerName = (this.Dealer === 'player') ? "player" : "cpu";
        console.log(`ディーラー: ${dealerName} / リード: ${this.currentPlayer}`);
        // 3枚-2枚の順で配る
        this.distribute(3);
        this.distribute(2);
        //切り札を設定
        this.trumpCard = this.deck.draw();
        this.trumpSuit = this.trumpCard.suit;


        document.getElementById('message-log').textContent =
            this.currentPlayer === 'player' ? "あなたのリードです" : "CPUのリードです";
        this.updateTrickDots(); // ドットをリセット
        this.render();
        // 交換フェーズの開始
        this.initiateExchangePhase();




    }
    initiateExchangePhase() {
        this.phaseState = 'exchangeRound';
        // 山札が空、または1枚しかない場合は強制的にゲーム開始（エカルテのルール）
        if (this.deck.cards.length < 2) {
            document.getElementById('message-log').textContent = "山札が足りないため、ゲームを開始します。";
            setTimeout(() => this.startActualGame(), 1500);
            return;
        }

        const nonDealer = (this.Dealer === 'player') ? 'cpu' : 'player';
        const log = document.getElementById('message-log');

        if (nonDealer === 'player') {
            log.textContent = "カードを交換しますか？（交換しない場合は「スタンド」）";
            document.getElementById('exchange-controls').style.display = 'block';
        } else {
            log.textContent = "CPUが交換を検討中...";
            setTimeout(() => this.cpuDecideExchange(), 1000);
        }
    }
    startActualGame() {
        document.getElementById('exchange-controls').style.display = 'none';
        if (this.hasTrumpKing(this.playerHand)) {
            this.declareKing('player')
        }
        if (this.hasTrumpKing(this.cpuHand)) {
            this.declareKing('cpu')
        }
        setTimeout(() => document.getElementById('message-log').textContent =
            game.currentPlayer === 'player' ? "あなたのリードです" : "CPUのリードです", 1000);

        game.updateTrickDots(); // ドットをリセット
        game.render();
        game.phaseState = 'playRound'; // ゲーム開始へ
        // CPUが先攻ならプレイさせる
        if (this.currentPlayer === 'cpu') {
            setTimeout(() => this.processCpuTurn(), 1000);
        }

    }
    // カードを交換するメイン処理
    processExchange(targetPlayer, selectedIndices) {
        console.log(`交換前 山札枚数: ${this.deck.cards.length}`);

        // 1. 削除処理（後ろのインデックスから順に消す）
        selectedIndices.sort((a, b) => b - a).forEach(index => {
            if (targetPlayer === 'player') {
                this.playerHand.splice(index, 1);
            } else {
                this.cpuHand.splice(index, 1);
            }
        });

        // 2. 補充処理（消した枚数分だけ山札から引く）
        const count = selectedIndices.length;
        for (let i = 0; i < count; i++) {
            const newCard = this.deck.draw();
            if (targetPlayer === 'player') {
                this.playerHand.push(newCard);
            } else {
                this.cpuHand.push(newCard);
            }
        }
        if (selectedIndices.length > 0) {
            this.wasExchanged = true; // 交換が発生したことを記録
        }
        console.log(`交換後 山札枚数: ${this.deck.cards.length}`);
        this.render(); // 画面更新
    }

    // CPUが交換するかどうか、どのカードを捨てるかを決める
    cpuDecideExchange() {
        const selectedIndices = [];
        console.log('カード交換前');//デバッグ用
        console.log(this.deck.cards.length);
        // 1. 捨てるカードのインデックスを特定する
        this.cpuHand.forEach((card, index) => {
            const isTrump = (card.suit === this.trumpSuit);
            const rankValue = RANK_VALUES[card.rank];

            // ルール：切り札ではなく、かつランクがJ(6)未満（A,10, 9, 8, 7）なら捨てる
            if (!isTrump && rankValue < 6) {
                selectedIndices.push(index);
            }
        });

        const log = document.getElementById('message-log');

        if (selectedIndices.length > 0) {
            // 自分がノンディーラーならプレイヤー（ディーラー）に許可を求める
            if (this.Dealer === 'player') {
                this.askPlayerAcceptance(selectedIndices);
            } else {
                // 自分がディーラーなら（本来このメソッドは呼ばれませんが念のため）
                this.processExchange('cpu', selectedIndices);
                this.startActualGame();
            }
        } else {
            log.textContent = "CPUは交換を希望しませんでした（スタンド）。";
            if (!game.wasExchanged) {
                game.exchangeRefuser = 'cpu';
            }
            setTimeout(() => { this.startActualGame() }, 1000);
        }
    }
    // プレイヤーの交換希望に対し、CPU（ディーラー）が許可するか決める
    cpuDecideAcceptance(playerSelectedIndices) {
        const log = document.getElementById('message-log');

        // CPUの「手札の強さ」を判定（切り札の数やランクの合計など）
        let handStrength = 0;
        this.cpuHand.forEach(card => {
            if (card.suit === this.trumpSuit) handStrength += 3; // 切り札は高く評価
            handStrength += RANK_VALUES[card.rank] / 2;
        });

        // 基準値（例：合計7以上）を超えていれば拒否する
        const willAccept = handStrength < 7;

        if (willAccept) {
            log.textContent = "CPU：交換を許可します。";
            alert("交換許可");
            setTimeout(() => {
                // プレイヤーの交換を実行
                this.processExchange('player', playerSelectedIndices);

                // CPU自身もついでに交換を検討する（ディーラーも交換できるため）
                this.cpuExchangeAsDealer();
            }, 1000);
        } else {
            log.textContent = "CPU：交換を拒絶します。勝負です！";
            if (!this.wasExchanged) {
                this.exchangeRefuser = 'cpu';
            }
            setTimeout(() => this.startActualGame(), 1500);
        }
    }

    // CPUがディーラーのときの交換処理
    cpuExchangeAsDealer() {
        const selectedIndices = [];
        this.cpuHand.forEach((card, index) => {
            if (card.suit !== this.trumpSuit && RANK_VALUES[card.rank] < 5) {
                selectedIndices.push(index);
            }
        });

        if (selectedIndices.length > 0) {
            this.processExchange('cpu', selectedIndices);
            document.getElementById('message-log').textContent = `CPUも ${selectedIndices.length} 枚交換しました。`;
        }

        setTimeout(() => this.startActualGame(), 1000);
    }
    // プレイヤーがカードをクリックした時の処理
    handleCardClick(index) {
        // 手番チェック：自分の番でない、または既にカードを出していたら無視
        if (this.currentPlayer !== 'player' || this.playerPlayedCard || this.phaseState !== 'playRound') {
            // this.render();  一旦更新
            return;
        }

        const card = this.playerHand[index];

        // ルール判定：スートフォローが必要
        if (!this.isValidMove(card, this.playerHand, this.leadSuit)) {
            alert("同じスートを持っていれば、それを出す必要があります！\n\rまた、同じスートを持っていない場合でも切り札のスートを持っていればそれを出す必要があります！");
            this.render(); // 一旦更新
            return;
        }

        // 1. プレイヤーがカードを出す
        this.playerPlayedCard = card;
        this.playerHand.splice(index, 1); // 手札から削除

        // 2. リードスートの決定（自分が先攻の場合）
        if (!this.leadSuit) this.leadSuit = card.suit;

        this.render(); // 一旦更新

        if (!this.cpuPlayedCard) {
            // ケースA: プレイヤーが「先攻（リード）」の場合
            // 次の手番をCPUにして、CPUにカードを出させる
            this.currentPlayer = 'cpu';
            setTimeout(() => this.processCpuTurn(), 800);
        } else {
            // ケースB: プレイヤーが「後攻」の場合（既にCPUがカードを出している）
            // 両者のカードが揃ったので、勝敗判定へ進む
            // ※currentPlayerはresolveTrick内で勝者に更新されるのでここでは変えなくてOK
            setTimeout(() => this.resolveTrick(), 1000);
        }
    }
    // CPUが交換を希望した際、プレイヤーに許可を求める
    askPlayerAcceptance(cpuSelectedIndices) {
        const log = document.getElementById('message-log');
        log.textContent = `CPUが ${cpuSelectedIndices.length} 枚の交換を希望しています。許可しますか？`;

        // プレイヤー用の承認・拒否ボタンを表示
        const dealerControls = document.getElementById('dealer-choice-controls');
        dealerControls.style.display = 'block';

        // 一旦イベントをクリアして再登録（古いイベントが残らないようにするため）
        const acceptBtn = document.getElementById('accept-btn');
        const refuseBtn = document.getElementById('refuse-btn');

        // 承認ボタン
        acceptBtn.onclick = () => {
            dealerControls.style.display = 'none';
            log.textContent = "あなたは交換を許可しました。";

            // 1. まずCPUが交換を実行
            this.processExchange('cpu', cpuSelectedIndices);

            // 2. 次にディーラー（プレイヤー）自身も交換できるチャンスを与える
            setTimeout(() => {
                log.textContent = "あなたも交換しますか？（任意）";
                document.getElementById('exchange-controls').style.display = 'block';
                // この時「捨てる」ボタンが押されたら processExchange('player', ...) 
                // 「スタンド」が押されたら startActualGame() に行くよう既存のボタンイベントを利用
            }, 1000);
        };

        // 拒否ボタン
        refuseBtn.onclick = () => {
            dealerControls.style.display = 'none';
            log.textContent = "あなたは交換を拒否しました。ゲームを開始します。";
            if (!game.wasExchanged) {
                game.exchangeRefuser = 'player';
            }
            setTimeout(() => this.startActualGame(), 1500);
        };
    }
    processCpuTurn() {
        // CPUがカードを選択
        const cpuCard = this.cpuPlay(this.playerPlayedCard);
        this.cpuPlayedCard = cpuCard;

        // CPUの手札から削除
        const cpuCardIdx = this.cpuHand.indexOf(cpuCard);
        this.cpuHand.splice(cpuCardIdx, 1);

        this.render(); // CPUのカードを表示


        if (this.playerPlayedCard) {
            // CPUがフォロー（後からカードを出した場合） 勝敗判定
            setTimeout(() => this.resolveTrick(), 1000);
        }
        else {
            //CPUがリードプレイヤーの場合プレイヤーにカードを出してもらう
            this.currentPlayer = 'player';
            this.leadSuit = this.cpuPlayedCard.suit;
        }
    }
    //CPUのプレイするカードを決定する
    cpuPlay(leadCard) {
        let selectedCard;
        const leadSuit = leadCard ? leadCard.suit : null;

        // 出せるカード（ルールに則ったもの）を抽出
        const legalMoves = this.cpuHand.filter(card =>
            this.isValidMove(card, this.cpuHand, leadSuit)
        );

        if (leadCard) {
            // 後攻の場合：勝てるカードを探す
            const winningMoves = legalMoves.filter(card =>
                this.determineWinner(leadCard, card, leadSuit) === "B"
            );

            if (winningMoves.length > 0) {
                // 勝てる中で一番弱いランクのものを出す
                selectedCard = winningMoves.sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank])[0];
            } else {
                // 勝てないなら一番弱いものを出す
                selectedCard = legalMoves.sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank])[0];
            }
        } else {
            // 先攻の場合：一番強いカード（Kなど）から出す
            selectedCard = legalMoves.sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank])[0];
        }

        return selectedCard;
    }
    resolveTrick() {
        // 現在のカードを出す順番（currentPlayer）ではなく、
        // 場にどちらが先にカードを出したか（leadSuitを決めたのは誰か）で判定します
        let winner;

        // プレイヤーが先にカードを出していた場合
        if (this.cpuPlayedCard && this.playerPlayedCard) {
            // CPUが後から出した = プレイヤーがリード
            if (this.currentPlayer === 'cpu') {
                winner = this.determineWinner(this.playerPlayedCard, this.cpuPlayedCard, this.leadSuit);
            } else {
                // プレイヤーが後から出した = CPUがリード
                winner = this.determineWinner(this.cpuPlayedCard, this.playerPlayedCard, this.leadSuit);
            }
        }

        // winner "A" は第1引数の勝ち、 "B" は第2引数の勝ち
        let trickWinner;
        if (this.currentPlayer === 'cpu') { // プレイヤーがリード
            trickWinner = (winner === "A") ? "player" : "cpu";
        } else { // CPUがリード
            trickWinner = (winner === "A") ? "cpu" : "player";
        }

        // --- 視覚的演出 ---
        const pCardEl = document.querySelector('#player-played-card .card');
        const cCardEl = document.querySelector('#cpu-played-card .card');
        const animationClass = (trickWinner === 'player') ? 'collect-to-player' : 'collect-to-cpu';

        if (pCardEl) pCardEl.classList.add(animationClass);
        if (cCardEl) cCardEl.classList.add(animationClass);

        this.tricksWon[trickWinner] += 1;
        this.updateTrickDots(); // ドットを更新

        // 次の手番（リード）は、このトリックの勝者
        this.currentPlayer = trickWinner;

        // ラウンド終了チェック
        if (this.playerHand.length === 0) {
            setTimeout(() => this.endRound(), 1500);
        } else {
            // アニメーション完了を待ってから場をリセット
            setTimeout(() => {
                this.playerPlayedCard = null;
                this.cpuPlayedCard = null;
                this.leadSuit = null;

                const log = document.getElementById('message-log');
                log.textContent = this.currentPlayer === 'player' ? "あなたのリードです" : "CPUのリードです";

                this.render();

                // 場が空になった後に、CPUがリードならプレイを開始させる
                if (this.currentPlayer === 'cpu') {
                    setTimeout(() => this.processCpuTurn(), 500);
                }
            }, 1000); // 演出時間
        }
    }
    // ラウンド（5トリック）終了時の得点計算
    endRound() {
        const winner = this.tricksWon.player > this.tricksWon.cpu ? 'player' : 'cpu';
        const loser = (winner === 'player') ? 'cpu' : 'player';
        let points = 0;

        if (this.tricksWon[winner] === 5) {
            // 全勝（ヴォール）は常に2点
            points = 2;
            document.getElementById('message-log').textContent = `全勝！ ${winner.toUpperCase()} が2点獲得！`;
        } else if (this.tricksWon[winner] >= 3) {
            // 通常の勝利（3〜4トリック）
            points = 1;

            // 【今回の重要ルール：交換なしペナルティ】
            if (!this.wasExchanged && this.exchangeRefuser === loser) {
                // 交換を提案しなかった、あるいは拒否した「責任者」が負けた場合にペナルティが発生する

                points = 2;
                document.getElementById('message-log').textContent = `交換拒否ペナルティ！ ${winner.toUpperCase()} が2点獲得！`;
            } else {
                document.getElementById('message-log').textContent = `${winner.toUpperCase()} が1点獲得！`;
            }
        }

        this.gameScore[winner] += points;
        this.playerPlayedCard = null;
        this.cpuPlayedCard = null;

        this.render(); // スコア表示の更新

        // alert(`ラウンド終了！ ${winner} が ${points} 点獲得しました。`);

        // 5点先取でゲームセット
        if (this.gameScore.player >= 5 || this.gameScore.cpu >= 5) {
            const finalWinner = this.gameScore.player >= 5 ? "あなた" : "CPU";
            alert(`ゲーム終了！優勝は ${finalWinner} です！`);
            //    this.resetGame();
        } else {
            // 次のラウンドへ
            setTimeout(() => game.startRound(), 1000);

        }
    }
    //指定枚数のカードを双方に配る
    distribute(count) {
        for (let i = 0; i < count; i++) {
            this.playerHand.push(this.deck.draw());
            this.cpuHand.push(this.deck.draw());
        }
    }
    // 切り札のキングを持っているかチェックする
    hasTrumpKing(hand) {
        return hand.some(card => card.rank === 'K' && card.suit === this.trumpSuit);
    }

    // キングの宣言処理
    declareKing(playerType) {
        const log = document.getElementById('message-log');
        const name = (playerType === 'player') ? "あなた" : "CPU";

        log.textContent = `${name}がキングを宣言しました！(+1点)`;
        this.gameScore[playerType] += 1; // ゲームスコアに加算

        this.render(); // スコア表示更新
        //スコア加算の結果勝利したらゲーム終了
        if (this.gameScore.player >= 5 || this.gameScore.cpu >= 5) {
            const finalWinner = this.gameScore.player >= 5 ? "あなた" : "CPU";
            alert(`ゲーム終了！優勝は ${finalWinner} です！`);
            //this.resetGame();
        }
    }
    // カードの「基本の強さ」を取得するメソッド
    getCardPower(card) {
        return RANK_VALUES[card.rank] || 0;
    }

    // 2枚のカードを比較し、先攻が勝った場合はA、後攻が勝った場合はBを返す
    determineWinner(cardA, cardB, leadSuit) {
        // cardA が先攻（リード）、cardB が後攻と仮定

        // 1. 切り札（Trump）の判定
        if (cardA.suit === this.trumpSuit && cardB.suit !== this.trumpSuit) return "A";
        if (cardB.suit === this.trumpSuit && cardA.suit !== this.trumpSuit) return "B";

        // 2. 同じスート同士の比較（両方切り札の場合も含む）
        if (cardA.suit === cardB.suit) {
            return RANK_VALUES[cardA.rank] > RANK_VALUES[cardB.rank] ? "A" : "B";
        }

        // 3. スートが異なり、どちらも切り札でない場合、リードスート（先攻）の勝ち
        // ※ルール上、後攻はスートをフォローしなければならないため、ここに来るのは「後攻がスートを持っていない」時のみ
        return "A";
    }
    //マストフォローを守っているかどうかチェック
    isValidMove(playedCard, hand, leadSuit) {
        // リード（1枚目）なら何を出してもOK
        if (!leadSuit) return true;

        // 手札に同じスートがあるか確認
        const hasSuit = hand.some(card => card.suit === leadSuit);

        if (hasSuit) {
            // 同じスートがあるのに、違うスートを出そうとしたらNG
            return playedCard.suit === leadSuit;
        }

        // リードスートを持っていない場合、切り札を持っていれば出さなければならない（エカルテ特有のルール）
        const hasTrump = hand.some(card => card.suit === this.trumpSuit);
        if (hasTrump && playedCard.suit !== this.trumpSuit) {
            return false;
        }

        return true; // どちらも持っていなければ何を出してもOK
    }
    // --- ここから描画ロジック ---
    createCardElement(card, isHidden = false, index = null) {
        const div = document.createElement('div');
        div.classList.add('card');

        if (isHidden) {
            div.classList.add('back');
            div.textContent = '？';
        } else {
            if (card.isRed) div.classList.add('red');
            div.innerHTML = `<div>${card.rank}</div><div>${card.symbols[card.suit]}</div>`;
            // --- ここを追加 ---
            if (index !== null) {
                div.dataset.index = index;
            }
            // ------------------
            // --- 追加：クリックイベント ---
            div.addEventListener('click', () => {
                // 'selected' クラスがあれば外し、なければ付ける
                div.classList.toggle('selected');
            });
        }
        return div;
    }

    render() {
        // --- 追加：リードプレイヤーの強調表示 ---
        const pLabel = document.getElementById('player-label');
        const cLabel = document.getElementById('cpu-label');

        // 一旦クラスを外す
        pLabel.classList.remove('active-lead');
        cLabel.classList.remove('active-lead');

        // リードプレイヤーの方にクラスを付与
        if (this.currentPlayer === 'player') {
            pLabel.classList.add('active-lead');
        } else if (this.currentPlayer === 'cpu') {
            cLabel.classList.add('active-lead');
        }

        // プレイヤー手札の表示
        const pContainer = document.getElementById('player-hand');
        pContainer.innerHTML = '';
        this.playerHand.forEach((card, index) => {
            const el = this.createCardElement(card, false, index);
            el.addEventListener('click', () => this.handleCardClick(index));
            pContainer.appendChild(el);
        });

        // CPU手札の表示（裏向き）
        const cContainer = document.getElementById('cpu-hand');
        cContainer.innerHTML = '';
        this.cpuHand.forEach((card, i) => cContainer.appendChild(this.createCardElement(null, true, i)));

        // 切り札の表示
        const tContainer = document.getElementById('trump-card-container');
        tContainer.innerHTML = '';
        tContainer.appendChild(this.createCardElement(this.trumpCard));

        // バトルエリアの描画
        const pSlot = document.getElementById('player-played-card');
        pSlot.innerHTML = '';
        if (this.playerPlayedCard) pSlot.appendChild(this.createCardElement(this.playerPlayedCard));

        const cSlot = document.getElementById('cpu-played-card');
        cSlot.innerHTML = '';
        if (this.cpuPlayedCard) cSlot.appendChild(this.createCardElement(this.cpuPlayedCard));
        // スコアの表示を更新
        document.getElementById('player-game-score').textContent = this.gameScore.player;
        document.getElementById('cpu-game-score').textContent = this.gameScore.cpu;
        this.updateTrickDots();

    }

    // ドットを点灯させる補助メソッド
    updateTrickDots() {
        const pDots = document.querySelectorAll('#player-trick-dots .dot');
        const cDots = document.querySelectorAll('#cpu-trick-dots .dot');

        // 一旦リセット
        pDots.forEach(d => d.classList.remove('won'));
        cDots.forEach(d => d.classList.remove('won'));

        // 獲得数分だけ光らせる
        for (let i = 0; i < this.tricksWon.player; i++) pDots[i].classList.add('won');
        for (let i = 0; i < this.tricksWon.cpu; i++) cDots[i].classList.add('won');
    }


}

// ゲームの起動
const game = new EcarteGame();
document.getElementById('start-btn').addEventListener('click', () => window.location.reload());
// index.htmlのボタンを取得
const exchangeBtn = document.getElementById('exchange-btn');
// プレイヤーが交換を確定させた時
document.getElementById('exchange-confirm-btn').addEventListener('click', () => {
    const selectedCards = document.querySelectorAll('#player-hand .card.selected');
    const indices = Array.from(selectedCards).map(card => parseInt(card.dataset.index));

    if (indices.length === 0 && game.Dealer === 'cpu') {
        alert("交換するカードを1枚以上選択してください");
        return;
    }

    // CPUがディーラーの場合、許可を求める
    if (game.Dealer === 'cpu') {
        document.getElementById('exchange-controls').style.display = 'none';
        game.cpuDecideAcceptance(indices);
    } else {
        // 自分がディーラーなら無条件で交換（本来は自分に聞くフェーズですが簡略化）
        document.getElementById('exchange-controls').style.display = 'none';
        game.processExchange('player', indices);
        setTimeout(() => game.initiateExchangePhase(), 1000);
    }

});
document.getElementById('stand-btn').addEventListener('click', () => {
    document.getElementById('exchange-controls').style.display = 'none';
    //CPUがディーラーならプレイに進む
    if (game.Dealer === 'cpu') {
        document.getElementById('message-log').textContent = "あなたはスタンドしました。ゲーム開始です。";
        if (!game.wasExchanged) {
            game.exchangeRefuser = 'player';
        }
        setTimeout(() => game.startActualGame(), 1000);// 交換せずに本編へ
    }
    //プレイヤーがディーラーの場合は再度CPUの交換希望を確認する
    else {
        document.getElementById('message-log').textContent = "あなたはカードを交換しませんでした。";
        setTimeout(() => game.initiateExchangePhase(), 1000);
    }

});


game.startRound();