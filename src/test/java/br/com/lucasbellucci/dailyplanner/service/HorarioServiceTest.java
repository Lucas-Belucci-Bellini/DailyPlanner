package br.com.lucasbellucci.dailyplanner.service;

import br.com.lucasbellucci.dailyplanner.model.Horario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import(HorarioService.class)
class HorarioServiceTest {

    private static final LocalDate DIA = LocalDate.of(2026, 8, 3);

    @Autowired
    private HorarioService service;

    private Horario novo(String titulo, String inicio, String fim) {
        return new Horario(titulo, DIA, LocalTime.parse(inicio), LocalTime.parse(fim));
    }

    @Test
    void salvaEListaOsCompromissosDoDiaEmOrdemDeHorario() {
        service.salvar(novo("Almoco", "12:00", "13:00"));
        service.salvar(novo("Estudo", "09:00", "11:00"));

        assertThat(service.listarPorDia(DIA))
                .extracting(Horario::getTitulo)
                .containsExactly("Estudo", "Almoco");
    }

    @Test
    void naoListaCompromissosDeOutroDia() {
        service.salvar(novo("Hoje", "09:00", "10:00"));

        assertThat(service.listarPorDia(DIA.plusDays(1))).isEmpty();
    }

    @Test
    void recusaTerminoAntesOuIgualAoInicio() {
        assertThatThrownBy(() -> service.salvar(novo("Invertido", "10:00", "09:00")))
                .isInstanceOf(HorarioInvalidoException.class)
                .hasMessageContaining("depois do inicio");

        assertThatThrownBy(() -> service.salvar(novo("Instantaneo", "10:00", "10:00")))
                .isInstanceOf(HorarioInvalidoException.class);
    }

    @Test
    void recusaIntervaloQueSeSobrepoeAOutroCompromissoDoMesmoDia() {
        service.salvar(novo("Reuniao", "09:00", "11:00"));

        assertThatThrownBy(() -> service.salvar(novo("Dentista", "10:00", "12:00")))
                .isInstanceOf(HorarioInvalidoException.class)
                .hasMessageContaining("Reuniao");
    }

    @Test
    void aceitaCompromissosEncostados() {
        service.salvar(novo("Reuniao", "09:00", "10:00"));
        service.salvar(novo("Estudo", "10:00", "11:00"));

        assertThat(service.listarPorDia(DIA)).hasSize(2);
    }

    @Test
    void aceitaOMesmoIntervaloEmDiaDiferente() {
        service.salvar(novo("Academia", "07:00", "08:00"));
        service.salvar(new Horario("Academia", DIA.plusDays(1), LocalTime.of(7, 0), LocalTime.of(8, 0)));

        assertThat(service.listarPorDia(DIA)).hasSize(1);
        assertThat(service.listarPorDia(DIA.plusDays(1))).hasSize(1);
    }

    @Test
    void aoEditarOCompromissoNaoConflitaComEleMesmo() {
        Horario salvo = service.salvar(novo("Estudo", "09:00", "11:00"));

        salvo.setTitulo("Estudo de Java");
        salvo.setHoraFim(LocalTime.of(12, 0));

        assertThat(service.salvar(salvo).getTitulo()).isEqualTo("Estudo de Java");
    }

    @Test
    void descricaoEmBrancoViraNula() {
        Horario horario = novo("Estudo", "09:00", "10:00");
        horario.setDescricao("   ");

        assertThat(service.salvar(horario).getDescricao()).isNull();
    }

    @Test
    void alternarConclusaoVaiEVolta() {
        Horario salvo = service.salvar(novo("Estudo", "09:00", "10:00"));

        assertThat(service.alternarConclusao(salvo.getId()).isConcluido()).isTrue();
        assertThat(service.alternarConclusao(salvo.getId()).isConcluido()).isFalse();
    }

    @Test
    void removeUmCompromisso() {
        Horario salvo = service.salvar(novo("Estudo", "09:00", "10:00"));

        service.remover(salvo.getId());

        assertThat(service.listarPorDia(DIA)).isEmpty();
    }

    @Test
    void reclamaAoBuscarOuRemoverIdInexistente() {
        assertThatThrownBy(() -> service.buscarPorId(404L))
                .isInstanceOf(HorarioNaoEncontradoException.class);
        assertThatThrownBy(() -> service.remover(404L))
                .isInstanceOf(HorarioNaoEncontradoException.class);
    }

    @Test
    void resumoSomaTempoOcupadoEConcluidos() {
        service.salvar(novo("Estudo", "09:00", "11:00"));
        Horario almoco = service.salvar(novo("Almoco", "12:00", "13:00"));
        service.alternarConclusao(almoco.getId());

        ResumoDoDia resumo = service.resumoDoDia(DIA);

        assertThat(resumo.total()).isEqualTo(2);
        assertThat(resumo.concluidos()).isEqualTo(1);
        assertThat(resumo.pendentes()).isEqualTo(1);
        assertThat(resumo.percentualConcluido()).isEqualTo(50);
        assertThat(resumo.tempoOcupadoFormatado()).isEqualTo("3h");
        assertThat(resumo.tempoLivreFormatado()).isEqualTo("21h");
    }

    @Test
    void resumoDeDiaVazio() {
        ResumoDoDia resumo = service.resumoDoDia(DIA);

        assertThat(resumo.total()).isZero();
        assertThat(resumo.percentualConcluido()).isZero();
        assertThat(resumo.tempoLivreFormatado()).isEqualTo("24h");
    }

    @Test
    void listaUmPeriodoDeDias() {
        service.salvar(novo("Hoje", "09:00", "10:00"));
        service.salvar(new Horario("Amanha", DIA.plusDays(1), LocalTime.of(9, 0), LocalTime.of(10, 0)));
        service.salvar(new Horario("Semana que vem", DIA.plusDays(8), LocalTime.of(9, 0), LocalTime.of(10, 0)));

        assertThat(service.listarPorPeriodo(DIA, DIA.plusDays(6)))
                .extracting(Horario::getTitulo)
                .containsExactly("Hoje", "Amanha");
    }
}
