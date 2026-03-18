class ResponseFormatter:
    """Format response per channel constraints."""

    CHANNEL_LIMITS = {
        "zalo_oa": 2000,
        "telegram": 4096,
        "web_admin": 10000,
    }

    def format(self, answer: str, sources: list, channel: str) -> str:
        """Format answer for specific channel."""
        max_len = self.CHANNEL_LIMITS.get(channel, 4096)

        formatted = answer

        # Add source citations if available
        if sources:
            top_sources = sources[:3]
            source_text = "\n\n---\nNguồn tham khảo:"
            for s in top_sources:
                doc_name = s.get("document", "")
                score = s.get("score", 0)
                if score > 0.8:
                    source_text += f"\n- {doc_name}"
            if source_text != "\n\n---\nNguồn tham khảo:":
                formatted += source_text

        # Channel-specific formatting
        if channel == "zalo_oa":
            formatted = self._format_zalo(formatted, max_len)
        elif channel == "telegram":
            formatted = self._format_telegram(formatted, max_len)

        return formatted

    def _format_zalo(self, text: str, max_len: int) -> str:
        """Zalo OA: no markdown, limited length."""
        # Strip markdown bold/italic
        text = text.replace("**", "").replace("*", "").replace("###", "").replace("##", "").replace("#", "")

        if len(text) > max_len:
            text = text[: max_len - 50] + "\n\n... Xem thêm tại Admin Panel."

        return text

    def _format_telegram(self, text: str, max_len: int) -> str:
        """Telegram: supports markdown, limited length."""
        if len(text) > max_len:
            text = text[: max_len - 50] + "\n\n... /more để xem tiếp."

        return text


response_formatter = ResponseFormatter()
