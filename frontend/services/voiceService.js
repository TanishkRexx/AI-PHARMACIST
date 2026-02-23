import api from "./api";

const voiceService = {

  askAI: async (message) => {
    try {
      const res = await api.post("/voice/", {
        message,
      });

      return {
        success: true,
        reply: res.data.reply,
      };

    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Voice error",
      };
    }
  },

};

export default voiceService;