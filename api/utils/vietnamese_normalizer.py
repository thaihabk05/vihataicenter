import re
import unicodedata


class VietnameseNormalizer:
    """Normalize Vietnamese text before embedding/search.
    Important for improving retrieval quality.
    """

    PRODUCT_ALIASES = {
        "omi": "OmiCall",
        "omi call": "OmiCall",
        "tổng đài ảo": "OmiCall",
        "tổng đài": "OmiCall",
        "esms": "eSMS",
        "sms brandname": "SMS Brandname",
        "tin nhắn thương hiệu": "SMS Brandname",
        "zalo oa": "Zalo OA",
        "zalo official account": "Zalo OA",
        "zns": "Zalo ZNS",
        "zalo notification": "Zalo ZNS",
        "omiflow": "OmiFlow",
        "mini crm": "MiniCRM",
        "voice brand": "Voice Brandname",
    }

    ABBREVIATIONS = {
        "hđ": "hợp đồng",
        "kh": "khách hàng",
        "nv": "nhân viên",
        "tp": "trưởng phòng",
        "gđ": "giám đốc",
        "bgđ": "ban giám đốc",
        "bhxh": "bảo hiểm xã hội",
        "bhyt": "bảo hiểm y tế",
        "hđlđ": "hợp đồng lao động",
        "gtgt": "giá trị gia tăng",
        "vat": "thuế giá trị gia tăng",
    }

    def normalize(self, text: str) -> str:
        """Full normalization pipeline."""
        text = self._normalize_unicode(text)
        text = self._expand_abbreviations(text)
        text = self._normalize_product_names(text)
        text = self._clean_whitespace(text)
        return text

    def _normalize_unicode(self, text: str) -> str:
        """Normalize Unicode (NFC form for Vietnamese)."""
        return unicodedata.normalize("NFC", text)

    def _expand_abbreviations(self, text: str) -> str:
        """Expand common abbreviations."""
        words = text.split()
        result = []
        for word in words:
            lower = word.lower()
            if lower in self.ABBREVIATIONS:
                result.append(self.ABBREVIATIONS[lower])
            else:
                result.append(word)
        return " ".join(result)

    def _normalize_product_names(self, text: str) -> str:
        """Normalize ViHAT product name variations."""
        lower_text = text.lower()
        for alias, standard in self.PRODUCT_ALIASES.items():
            if alias in lower_text:
                text = re.sub(re.escape(alias), standard, text, flags=re.IGNORECASE)
        return text

    def _clean_whitespace(self, text: str) -> str:
        """Clean excessive whitespace."""
        text = re.sub(r"\s+", " ", text)
        return text.strip()


vietnamese_normalizer = VietnameseNormalizer()
