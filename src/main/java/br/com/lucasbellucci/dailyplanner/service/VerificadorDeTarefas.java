package br.com.lucasbellucci.dailyplanner.service;

import br.com.lucasbellucci.dailyplanner.model.Horario;
import br.com.lucasbellucci.dailyplanner.repository.HorarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Component
public class VerificadorDeTarefas {

    private static final Logger log = LoggerFactory.getLogger(VerificadorDeTarefas.class);

    private final HorarioRepository repository;
    private final TelegramService telegramService;

    public VerificadorDeTarefas(HorarioRepository repository, TelegramService telegramService) {
        this.repository = repository;
        this.telegramService = telegramService;
    }

    @Scheduled(fixedRate = 60000)
    public void verificarHorarios() {
        LocalDate hoje = LocalDate.now();
        LocalTime agora = LocalTime.now();
        LocalTime daquiA5 = agora.plusMinutes(5);

        List<Horario> tarefas = repository.findByDataAndHoraInicioBetweenAndNotificadoFalse(hoje, agora, daquiA5);

        if (tarefas.isEmpty()) {
            return;
        }

        for (Horario t : tarefas) {
            String mensagem = "⚠️ ATENÇÃO: Sua tarefa '" + t.getTitulo() + "' começa às " + t.getHoraInicio() + "!";
            telegramService.enviarLembrete(mensagem);
            t.setNotificado(true);
            repository.save(t);
            log.info("Notificado: {} -> {}", t.getId(), t.getTitulo());
        }
    }
}
