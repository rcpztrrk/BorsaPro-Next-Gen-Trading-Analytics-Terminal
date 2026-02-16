import pandas as pd
import numpy as np
from typing import Dict, List

class IndicatorService:
    def add_indicators(self, data_list: List[Dict]) -> List[Dict]:
        """
        Receives a list of dictionaries (records from DataService),
        converts to DataFrame, adds indicators, and returns list of dicts.
        """
        if not data_list:
            return []
            
        df = pd.DataFrame(data_list)
        
        # Ensure numeric columns
        cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        for c in cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors='coerce')
                
        # Calculate Indicators
        df = self.add_moving_averages(df)
        df = self.add_ema(df)
        df = self.add_rsi(df)
        df = self.add_macd(df)
        df = self.add_bollinger_bands(df)
        df = self.add_nadaraya_watson(df)
        df = self.add_atr(df)
        df = self.add_supertrend(df)
        df = self.add_stochastic(df)
        df = self.add_vwap(df)
        df = self.add_mfi(df)
        df = self.add_cci(df)
        df = self.add_bollinger_percent(df)
        df = self.add_williams_r(df)
        df = self.add_cmf(df)
        df = self.detect_patterns(df)
        
        # Handle NaN values for JSON serialization
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.fillna(0)
        
        return df.to_dict(orient='records')

    def detect_patterns(self, df: pd.DataFrame) -> pd.DataFrame:
        if len(df) < 20: return df
        
        # Ensure we have MA20 for trend filtering
        if 'MA20' not in df.columns:
            df = self.add_moving_averages(df)
            
        df['AI_PATTERN_LABEL'] = ""
        df['AI_PATTERN_TYPE'] = 0 # 1 for Bullish, -1 for Bearish
        df['AI_PATTERN_CONF'] = 0
        
        close = df['Close'].values
        open_ = df['Open'].values
        high = df['High'].values
        low = df['Low'].values
        vol = df['Volume'].values
        ma20 = df['MA20'].values
        vol_avg = df['Volume'].rolling(window=20).mean().values

        for i in range(2, len(df)):
            body = abs(close[i] - open_[i])
            upper_wick = high[i] - max(open_[i], close[i])
            lower_wick = min(open_[i], close[i]) - low[i]
            total_range = high[i] - low[i]
            if total_range == 0: continue
            
            is_bullish_trend = close[i] > ma20[i]
            is_bearish_trend = close[i] < ma20[i]
            vol_spike = vol[i] > (vol_avg[i] * 1.2)
            
            label = ""
            ptype = 0
            conf = 0

            # 1. HAMMER (Boğa - Düşüş trendinde)
            if is_bearish_trend and lower_wick > (body * 2) and upper_wick < (body * 0.5):
                label = "Çekiç (Hammer)"
                ptype = 1
                conf = 70 + (20 if vol_spike else 0)
            
            # 2. SHOOTING STAR (Ayı - Yükseliş trendinde)
            elif is_bullish_trend and upper_wick > (body * 2) and lower_wick < (body * 0.5):
                label = "Ters Çekiç (Shooting Star)"
                ptype = -1
                conf = 70 + (20 if vol_spike else 0)

            # 3. ENGULFING (Yutan Mum)
            prev_body = abs(close[i-1] - open_[i-1])
            if body > prev_body:
                # Bullish Engulfing
                if is_bearish_trend and close[i] > open_[i] and close[i-1] < open_[i-1] and close[i] > open_[i-1] and open_[i] < close[i-1]:
                    label = "Boğa Yutan (Engulfing)"
                    ptype = 1
                    conf = 75 + (15 if vol_spike else 0)
                # Bearish Engulfing
                elif is_bullish_trend and close[i] < open_[i] and close[i-1] > open_[i-1] and close[i] < open_[i-1] and open_[i] > close[i-1]:
                    label = "Ayı Yutan (Engulfing)"
                    ptype = -1
                    conf = 75 + (15 if vol_spike else 0)

            # 4. MORNING / EVENING STAR (Yıldızlar)
            if not label:
                # Morning Star (Bullish Reversal)
                if is_bearish_trend and close[i-2] < open_[i-2] and abs(close[i-1]-open_[i-1]) < (abs(close[i-2]-open_[i-2])*0.3) and close[i] > open_[i] and close[i] > (open_[i-2] + close[i-2])/2:
                    label = "Sabah Yıldızı (Morning Star)"
                    ptype = 1
                    conf = 85
                # Evening Star (Bearish Reversal)
                elif is_bullish_trend and close[i-2] > open_[i-2] and abs(close[i-1]-open_[i-1]) < (abs(close[i-2]-open_[i-2])*0.3) and close[i] < open_[i] and close[i] < (open_[i-2] + close[i-2])/2:
                    label = "Akşam Yıldızı (Evening Star)"
                    ptype = -1
                    conf = 85

            if label:
                df.at[df.index[i], 'AI_PATTERN_LABEL'] = label
                df.at[df.index[i], 'AI_PATTERN_TYPE'] = ptype
                df.at[df.index[i], 'AI_PATTERN_CONF'] = conf

        return df

    def add_moving_averages(self, df: pd.DataFrame) -> pd.DataFrame:
        periods = [20, 50, 200]
        for p in periods:
            if len(df) >= p:
                df[f'MA{p}'] = df['Close'].rolling(window=p).mean()
        return df

    def add_ema(self, df: pd.DataFrame) -> pd.DataFrame:
        periods = [9, 21]
        for p in periods:
            if len(df) >= p:
                df[f'EMA{p}'] = df['Close'].ewm(span=p, adjust=False).mean()
        return df

    def add_rsi(self, df: pd.DataFrame, period=14) -> pd.DataFrame:
        if len(df) < period + 1: return df
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        return df

    def add_macd(self, df: pd.DataFrame) -> pd.DataFrame:
        if len(df) < 26: return df
        exp1 = df['Close'].ewm(span=12, adjust=False).mean()
        exp2 = df['Close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = exp1 - exp2
        df['MACD_SIGNAL'] = df['MACD'].ewm(span=9, adjust=False).mean()
        return df

    def add_bollinger_bands(self, df: pd.DataFrame, period=20, std_dev=2) -> pd.DataFrame:
        if len(df) < period: return df
        sma = df['Close'].rolling(window=period).mean()
        rstd = df['Close'].rolling(window=period).std()
        df['BB_UPPER'] = sma + (rstd * std_dev)
        df['BB_LOWER'] = sma - (rstd * std_dev)
        df['BB_MIDDLE'] = sma
        return df

    def add_atr(self, df: pd.DataFrame, period=14) -> pd.DataFrame:
        if len(df) < period: return df
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = np.max(ranges, axis=1)
        df['ATR'] = true_range.rolling(window=period).mean()
        return df

    def add_supertrend(self, df: pd.DataFrame, period=10, multiplier=3) -> pd.DataFrame:
        if 'ATR' not in df.columns:
            df = self.add_atr(df, period=period)
        
        hl2 = (df['High'] + df['Low']) / 2
        upperband = hl2 + (multiplier * df['ATR'])
        lowerband = hl2 - (multiplier * df['ATR'])
        
        # SuperTrend calculation logic
        supertrend = [True] * len(df)
        final_upperband = [0.0] * len(df)
        final_lowerband = [0.0] * len(df)
        trend = np.zeros(len(df))
        
        for i in range(1, len(df)):
            # Final Upperband
            if upperband.iloc[i] < final_upperband[i-1] or df['Close'].iloc[i-1] > final_upperband[i-1]:
                final_upperband[i] = upperband.iloc[i]
            else:
                final_upperband[i] = final_upperband[i-1]
                
            # Final Lowerband
            if lowerband.iloc[i] > final_lowerband[i-1] or df['Close'].iloc[i-1] < final_lowerband[i-1]:
                final_lowerband[i] = lowerband.iloc[i]
            else:
                final_lowerband[i] = final_lowerband[i-1]
                
            # Trend
            if df['Close'].iloc[i] <= final_upperband[i]:
                trend[i] = 1 # Down (or rather index 1)
            else:
                trend[i] = -1 # Up
                
            if trend[i-1] == 1 and df['Close'].iloc[i] > final_upperband[i]:
                trend[i] = -1
            elif trend[i-1] == -1 and df['Close'].iloc[i] < final_lowerband[i]:
                trend[i] = 1
            else:
                trend[i] = trend[i-1]

        df['ST_UPPER'] = final_upperband
        df['ST_LOWER'] = final_lowerband
        df['ST_TREND'] = trend # -1 for Up (Green), 1 for Down (Red)
        return df

    def add_stochastic(self, df: pd.DataFrame, k_period=14, d_period=3) -> pd.DataFrame:
        if len(df) < k_period: return df
        low_min = df['Low'].rolling(window=k_period).min()
        high_max = df['High'].rolling(window=k_period).max()
        df['STOCH_K'] = 100 * (df['Close'] - low_min) / (high_max - low_min)
        df['STOCH_D'] = df['STOCH_K'].rolling(window=d_period).mean()
        return df

    def add_vwap(self, df: pd.DataFrame) -> pd.DataFrame:
        # Simple cumulative VWAP (professional systems often reset daily)
        v = df['Volume'].values
        tp = (df['High'] + df['Low'] + df['Close']).values / 3
        df['VWAP'] = np.cumsum(tp * v) / np.cumsum(v)
        return df

    def add_nadaraya_watson(self, df: pd.DataFrame, h=14, window=50, mult=2.0) -> pd.DataFrame:
        """
        Nadaraya-Watson Estimator (Gaussian Kernel) + Kernel Envelopes & LuxAlgo Signals
        """
        if len(df) < window: return df
        
        close = df['Close'].values
        nw_vals = np.zeros_like(close)
        
        # 1. Calculate NW Smooth
        for i in range(len(close)):
            start = max(0, i - window)
            end = i + 1
            y = close[start:end]
            x = np.arange(len(y))
            current_x = x[-1]
            
            # Gaussian Kernel
            weights = np.exp(-((current_x - x) ** 2) / (2 * h ** 2))
            nw_vals[i] = np.sum(weights * y) / np.sum(weights)
            
        df['NW_SMOOTH'] = nw_vals
        
        # 2. Calculate Kernel Envelopes (LuxAlgo style)
        # We use the mean absolute error or stdev relative to the smooth
        diff = np.abs(close - nw_vals)
        # Smooth the diff to get a dynamic envelope
        mae = pd.Series(diff).rolling(window=window).mean().values
        df['NW_UPPER'] = nw_vals + (mae * mult)
        df['NW_LOWER'] = nw_vals - (mae * mult)
        
        # 3. Calculate Direction (Slope)
        df['NW_DIR'] = np.where(df['NW_SMOOTH'].diff() > 0, 1, -1)
        
        # 4. Detect Signals (Price crossing or tagging envelopes)
        df['NW_SIGNAL'] = 0
        for i in range(1, len(df)):
            # Buy Signal: Price crosses below Lower Envelope or local bottom below it
            if close[i] < df['NW_LOWER'].iloc[i] and close[i-1] >= df['NW_LOWER'].iloc[i-1]:
                df.loc[df.index[i], 'NW_SIGNAL'] = 1 # Green Triangle (Up)
            # Sell Signal: Price crosses above Upper Envelope or local top above it
            elif close[i] > df['NW_UPPER'].iloc[i] and close[i-1] <= df['NW_UPPER'].iloc[i-1]:
                df.loc[df.index[i], 'NW_SIGNAL'] = -1 # Red Triangle (Down)

        return df

    def add_mfi(self, df: pd.DataFrame, period=14) -> pd.DataFrame:
        if len(df) < period: return df
        typical_price = (df['High'] + df['Low'] + df['Close']) / 3
        money_flow = typical_price * df['Volume']
        positive_flow = money_flow.where(typical_price > typical_price.shift(1), 0).rolling(window=period).sum()
        negative_flow = money_flow.where(typical_price < typical_price.shift(1), 0).rolling(window=period).sum()
        mfr = positive_flow / negative_flow
        df['MFI'] = 100 - (100 / (1 + mfr))
        return df

    def add_cci(self, df: pd.DataFrame, period=20) -> pd.DataFrame:
        if len(df) < period: return df
        tp = (df['High'] + df['Low'] + df['Close']) / 3
        sma_tp = tp.rolling(window=period).mean()
        mad_tp = tp.rolling(window=period).apply(lambda x: np.abs(x - x.mean()).mean())
        df['CCI'] = (tp - sma_tp) / (0.015 * mad_tp)
        return df

    def add_bollinger_percent(self, df: pd.DataFrame) -> pd.DataFrame:
        if 'BB_UPPER' not in df.columns:
            df = self.add_bollinger_bands(df)
        df['BB_PCT'] = (df['Close'] - df['BB_LOWER']) / (df['BB_UPPER'] - df['BB_LOWER'])
        return df

    def add_williams_r(self, df: pd.DataFrame, period=14) -> pd.DataFrame:
        if len(df) < period: return df
        high_max = df['High'].rolling(window=period).max()
        low_min = df['Low'].rolling(window=period).min()
        df['WILLIAMS_R'] = -100 * (high_max - df['Close']) / (high_max - low_min)
        return df

    def add_cmf(self, df: pd.DataFrame, period=20) -> pd.DataFrame:
        if len(df) < period: return df
        mf_multiplier = ((df['Close'] - df['Low']) - (df['High'] - df['Close'])) / (df['High'] - df['Low'])
        mf_volume = mf_multiplier * df['Volume']
        df['CMF'] = mf_volume.rolling(window=period).sum() / df['Volume'].rolling(window=period).sum()
        return df
