# ⚡ Borsa Terminali Pro

Modern ve dinamik bir borsa takip terminali. Bu proje, **yfinance API**'sini kullanarak Borsa İstanbul (BIST) hisselerini anlık takip etmenize, teknik analiz yapmanıza ve finansal verileri detaylı bir şekilde incelemenize olanak tanır.

---

## ✨ Öne Çıkan Özellikler

### 📊 Gelişmiş Grafik Deneyimi
- **Lightweight Charts**: TradingView altyapısıyla akıcı ve profesyonel grafik deneyimi.
- **Çoklu Zaman Dilimi**: 1dk'dan 1 haftaya kadar değişen periyotlarda veri analizi.
- **İnteraktif Çizim Araçları**: Grafik üzerinde trend çizgileri ve analiz araçları.

### 🔍 Teknik Analiz Göstergeleri (30+)
- **Trend**: MA, EMA, SuperTrend, NW Smooth (LuxAlgo adaptation).
- **Momentum**: RSI, MACD, Stochastic %K/%D.
- **Volatilite**: Bollinger Bantları, ATR.
- **Hacim**: MFI, CMF, VWAP, CCI.
- **Yapay Zeka**: AI Pattern gösterimi ve güven skorları.

### 💎 Finansal Sağlık ve Oranlar
- **Kârlılık**: ROE, ROA, Net Marj takibi.
- **Sağlık**: Cari Oran, Borç/Özkaynak rasyoları.
- **Mali Tablolar**: Gelir Tablosu, Bilanço ve Nakit Akışı özetleri (Yıllık ve Çeyreklik).

---

## 🚀 Kurulum ve Çalıştırma

En hızlı yol için ana dizindeki `baslat.bat` dosyasını kullanabilirsiniz. Manuel kurulum için:

### 🐍 1. Arka Uç (Python + FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### ⚛️ 2. Ön Yüz (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠️ Teknoloji Yığını

- **Dil**: Python 3.10+, JavaScript (ES6+)
- **Çerçeveler**: FastAPI, React 18
- **Veri İşleme**: Pandas, NumPy
- **Grafik**: TradingView Lightweight Charts
- **İkonlar**: Lucide React

---

## ⚠️ Yasal Uyarı

Bu uygulama sadece **eğitim ve kişisel takip amaçlı** geliştirilmiştir. Uygulama içerisinde sunulan veriler `yfinance` üzerinden çekilmektedir ve gecikmeli olabilir. **Kesinlikle yatırım tavsiyesi içermez.**

---

*Geliştirici: [Recep]*
