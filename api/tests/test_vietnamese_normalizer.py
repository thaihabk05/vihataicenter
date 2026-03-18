from utils.vietnamese_normalizer import VietnameseNormalizer


def test_normalize_product_names():
    normalizer = VietnameseNormalizer()
    result = normalizer.normalize("cho tôi giá omi call")
    assert "OmiCall" in result


def test_expand_abbreviations():
    normalizer = VietnameseNormalizer()
    result = normalizer.normalize("hđ kh mới")
    assert "hợp đồng" in result
    assert "khách hàng" in result


def test_clean_whitespace():
    normalizer = VietnameseNormalizer()
    result = normalizer.normalize("  hello   world  ")
    assert result == "hello world"


def test_zns_normalization():
    normalizer = VietnameseNormalizer()
    result = normalizer.normalize("gửi tin zns")
    assert "Zalo ZNS" in result
