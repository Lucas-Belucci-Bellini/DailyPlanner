package br.com.lucasbellucci.dailyplanner.web;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DatasPtBrTest {

    @Test
    void escreveADataPorExtensoEmPortugues() {
        assertThat(DatasPtBr.porExtenso(LocalDate.of(2026, 8, 3)))
                .isEqualTo("Segunda-feira, 3 de agosto de 2026");
    }

    @Test
    void soAPrimeiraLetraEMaiuscula() {
        String texto = DatasPtBr.porExtenso(LocalDate.of(2026, 12, 25));

        assertThat(texto).isEqualTo("Sexta-feira, 25 de dezembro de 2026");
        assertThat(texto).doesNotContain(" De ").doesNotContain("-Feira");
    }

    @Test
    void escreveADataNoFormatoCurto() {
        assertThat(DatasPtBr.curta(LocalDate.of(2026, 8, 3))).isEqualTo("03/08/2026");
    }
}
