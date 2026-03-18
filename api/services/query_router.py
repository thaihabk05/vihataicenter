from models.user import User


class QueryRouter:
    """Route user query to the correct Knowledge Base(s) based on:
    1. User's department (RBAC)
    2. Query content (keyword detection)
    3. Explicit department tag (if any)
    """

    KB_ACCESS = {
        "sales": ["sales", "general"],
        "hr": ["hr", "general"],
        "accounting": ["accounting", "general"],
        "management": ["sales", "hr", "accounting", "general", "management"],
    }

    KB_KEYWORDS = {
        "sales": [
            "sản phẩm", "giá", "gói", "khách hàng", "proposal", "slide",
            "omicall", "esms", "sms", "zalo oa", "zns", "brandname",
            "demo", "báo giá", "hợp đồng", "đối thủ", "tính năng",
        ],
        "hr": [
            "nghỉ phép", "tuyển dụng", "lương", "bảo hiểm", "nội quy",
            "đánh giá", "kpi nhân viên", "onboarding", "training",
            "chấm công", "phúc lợi", "hợp đồng lao động",
        ],
        "accounting": [
            "hóa đơn", "thuế", "thanh toán", "công nợ", "chi phí",
            "ngân sách", "báo cáo tài chính", "kế toán", "xuất hóa đơn",
            "vat", "tạm ứng", "hoàn ứng", "quyết toán",
        ],
    }

    async def route(self, query: str, user: User) -> list[str]:
        """Determine which KB(s) to search."""
        accessible = self.KB_ACCESS.get(user.department, ["general"])

        detected_depts = self._detect_department(query)

        if detected_depts:
            routed = [d for d in detected_depts if d in accessible]
            if routed:
                if "general" not in routed and "general" in accessible:
                    routed.append("general")
                return routed

        primary = user.department if user.department in accessible else "general"
        result = [primary]
        if "general" not in result:
            result.append("general")
        return result

    def _detect_department(self, query: str) -> list[str]:
        """Simple keyword-based department detection."""
        query_lower = query.lower()
        scores: dict[str, int] = {}

        for dept, keywords in self.KB_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in query_lower)
            if score > 0:
                scores[dept] = score

        if not scores:
            return []

        max_score = max(scores.values())
        return [dept for dept, score in scores.items() if score >= max_score]


query_router = QueryRouter()
