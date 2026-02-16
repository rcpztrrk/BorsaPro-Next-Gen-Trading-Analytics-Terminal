"""
Yardımcı fonksiyonlar - Güvenli print ve diğer utilities
"""

def safe_print(msg):
    """
    Windows konsolunda ve Streamlit ortamında güvenli yazdırma.
    Encoding ve I/O hatalarını önler.
    """
    try:
        print(msg)
    except (UnicodeEncodeError, OSError, ValueError, Exception):
        try:
            # ASCII'ye zorla
            clean_msg = str(msg).encode('ascii', 'ignore').decode('ascii')
            print(clean_msg)
        except:
            # Hiçbir şey yapılamazsa sessiz kal
            pass
