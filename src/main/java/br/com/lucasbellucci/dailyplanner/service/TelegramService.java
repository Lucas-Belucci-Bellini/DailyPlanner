package br.com.lucasbellucci.dailyplanner.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Serviço simples para enviar mensagens via Bot do Telegram.
 * Token e chat id devem ser fornecidos via variáveis de ambiente
 * (application.properties ou env): telegram.token e telegram.chatId
 */
@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);

    @Value("${telegram.token:}")
    private String token;

    @Value("${telegram.chatId:}")
    private String chatId;

    private final RestTemplate rest = new RestTemplate();

    public boolean disponivel() {
        return token != null && !token.isBlank() && chatId != null && !chatId.isBlank();
    }

    public void enviarLembrete(String mensagem) {
        if (!disponivel()) {
            log.info("Telegram não configurado — mensagem não enviada: {}", mensagem);
            return;
        }

        String url = "https://api.telegram.org/bot" + token + "/sendMessage?chat_id=" + chatId + "&text=" + urlEncode(mensagem);
        try {
            rest.getForObject(url, String.class);
            log.info("Mensagem enviada ao Telegram: {}", mensagem);
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem ao Telegram: {}", e.getMessage());
        }
    }

    private String urlEncode(String s) {
        try {
            return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }
}
