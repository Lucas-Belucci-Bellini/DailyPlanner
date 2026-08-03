package br.com.lucasbellucci.dailyplanner.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class HorarioTest {

    private static final LocalDate DIA = LocalDate.of(2026, 8, 3);

    private Horario horario(String titulo, String inicio, String fim) {
        return new Horario(titulo, DIA, LocalTime.parse(inicio), LocalTime.parse(fim));
    }

    @Test
    void calculaADuracaoEntreInicioEFim() {
        assertThat(horario("Estudo", "09:00", "10:30").getDuracao().toMinutes()).isEqualTo(90);
    }

    @Test
    void duracaoEZeroQuandoOIntervaloEInvalido() {
        assertThat(horario("Estudo", "10:00", "09:00").getDuracao()).isZero();
    }

    @Test
    void formataADuracaoParaLeitura() {
        assertThat(horario("a", "09:00", "10:30").getDuracaoFormatada()).isEqualTo("1h30");
        assertThat(horario("b", "09:00", "11:00").getDuracaoFormatada()).isEqualTo("2h");
        assertThat(horario("c", "09:00", "09:45").getDuracaoFormatada()).isEqualTo("45min");
    }

    @Test
    void detectaSobreposicaoNoMesmoDia() {
        assertThat(horario("a", "09:00", "11:00").conflitaCom(horario("b", "10:00", "12:00"))).isTrue();
        assertThat(horario("a", "09:00", "12:00").conflitaCom(horario("b", "10:00", "11:00"))).isTrue();
    }

    @Test
    void horariosEncostadosNaoConflitam() {
        assertThat(horario("a", "09:00", "10:00").conflitaCom(horario("b", "10:00", "11:00"))).isFalse();
    }

    @Test
    void mesmoIntervaloEmDiasDiferentesNaoConflita() {
        Horario hoje = horario("a", "09:00", "10:00");
        Horario amanha = new Horario("b", DIA.plusDays(1), LocalTime.of(9, 0), LocalTime.of(10, 0));
        assertThat(hoje.conflitaCom(amanha)).isFalse();
    }
}
