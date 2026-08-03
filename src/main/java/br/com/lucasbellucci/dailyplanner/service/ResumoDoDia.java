package br.com.lucasbellucci.dailyplanner.service;

import java.time.Duration;
import java.time.LocalDate;

/**
 * Numeros consolidados de um dia da agenda, usados no cabecalho da tela.
 */
public record ResumoDoDia(LocalDate data, long total, long concluidos, Duration tempoOcupado) {

    public static ResumoDoDia vazio(LocalDate data) {
        return new ResumoDoDia(data, 0, 0, Duration.ZERO);
    }

    public long pendentes() {
        return total - concluidos;
    }

    /**
     * Percentual concluido (0 a 100), para a barra de progresso.
     */
    public int percentualConcluido() {
        if (total == 0) {
            return 0;
        }
        return (int) Math.round(concluidos * 100.0 / total);
    }

    public String tempoOcupadoFormatado() {
        long horas = tempoOcupado.toHours();
        long minutos = tempoOcupado.toMinutesPart();
        if (horas > 0 && minutos > 0) {
            return horas + "h" + String.format("%02d", minutos);
        }
        if (horas > 0) {
            return horas + "h";
        }
        return minutos + "min";
    }

    /**
     * Quanto sobra das 24 horas do dia.
     */
    public String tempoLivreFormatado() {
        Duration livre = Duration.ofHours(24).minus(tempoOcupado);
        if (livre.isNegative()) {
            livre = Duration.ZERO;
        }
        long horas = livre.toHours();
        long minutos = livre.toMinutesPart();
        if (horas > 0 && minutos > 0) {
            return horas + "h" + String.format("%02d", minutos);
        }
        if (horas > 0) {
            return horas + "h";
        }
        return minutos + "min";
    }
}
