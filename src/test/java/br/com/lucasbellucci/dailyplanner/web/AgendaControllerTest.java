package br.com.lucasbellucci.dailyplanner.web;

import br.com.lucasbellucci.dailyplanner.model.Horario;
import br.com.lucasbellucci.dailyplanner.service.HorarioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AgendaControllerTest {

    private static final String DIA = "2026-08-03";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HorarioService service;

    private Horario salvar(String titulo, String inicio, String fim) {
        return service.salvar(new Horario(titulo, LocalDate.parse(DIA),
                LocalTime.parse(inicio), LocalTime.parse(fim)));
    }

    @Test
    void aRaizLevaParaAAgenda() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/agenda"));
    }

    @Test
    void aAgendaAbreNoDiaDeHojeQuandoNenhumaDataEInformada() throws Exception {
        mockMvc.perform(get("/agenda"))
                .andExpect(status().isOk())
                .andExpect(view().name("agenda/dia"))
                .andExpect(model().attribute("dia", LocalDate.now()));
    }

    @Test
    void aAgendaMostraOsCompromissosDoDiaEscolhido() throws Exception {
        salvar("Estudar Spring Boot", "09:00", "10:30");

        mockMvc.perform(get("/agenda").param("data", DIA))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Estudar Spring Boot")))
                .andExpect(content().string(containsString("09:00")))
                .andExpect(content().string(containsString("10:30")))
                .andExpect(content().string(containsString("1h30")));
    }

    @Test
    void diaSemCompromissosMostraOEstadoVazio() throws Exception {
        mockMvc.perform(get("/agenda").param("data", DIA))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Nenhum compromisso marcado")));
    }

    @Test
    void oFormularioDeNovoCompromissoJaVemComADataEscolhida() throws Exception {
        mockMvc.perform(get("/agenda/novo").param("data", DIA))
                .andExpect(status().isOk())
                .andExpect(view().name("agenda/formulario"))
                .andExpect(model().attribute("edicao", false))
                .andExpect(content().string(containsString(DIA)));
    }

    @Test
    void salvarCriaOCompromissoEVoltaParaODia() throws Exception {
        mockMvc.perform(post("/agenda/salvar")
                        .param("titulo", "Academia")
                        .param("data", DIA)
                        .param("horaInicio", "07:00")
                        .param("horaFim", "08:00"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/agenda?data=" + DIA));

        assertThat(service.listarPorDia(LocalDate.parse(DIA)))
                .extracting(Horario::getTitulo)
                .containsExactly("Academia");
    }

    @Test
    void oRedirectDepoisDeSalvarAbreODiaCerto() throws Exception {
        String destino = mockMvc.perform(post("/agenda/salvar")
                        .param("titulo", "Academia")
                        .param("data", DIA)
                        .param("horaInicio", "07:00")
                        .param("horaFim", "08:00"))
                .andExpect(status().is3xxRedirection())
                .andReturn()
                .getResponse()
                .getRedirectedUrl();

        // Seguir o redirect precisa funcionar: a data viaja em ISO, nao em dd/MM/yyyy.
        mockMvc.perform(get(destino))
                .andExpect(status().isOk())
                .andExpect(model().attribute("dia", LocalDate.parse(DIA)))
                .andExpect(content().string(containsString("Academia")));
    }

    @Test
    void osLinksDeNavegacaoEntreDiasUsamDatasEmIso() throws Exception {
        mockMvc.perform(get("/agenda").param("data", DIA))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/agenda?data=2026-08-02")))
                .andExpect(content().string(containsString("/agenda?data=2026-08-04")));
    }

    @Test
    void salvarSemTituloVoltaParaOFormularioComErro() throws Exception {
        mockMvc.perform(post("/agenda/salvar")
                        .param("titulo", "")
                        .param("data", DIA)
                        .param("horaInicio", "07:00")
                        .param("horaFim", "08:00"))
                .andExpect(status().isOk())
                .andExpect(view().name("agenda/formulario"))
                .andExpect(model().attributeHasFieldErrors("horario", "titulo"))
                .andExpect(content().string(containsString("Informe o titulo da tarefa")));
    }

    @Test
    void salvarComTerminoAntesDoInicioMostraOErroNoCampoDeTermino() throws Exception {
        mockMvc.perform(post("/agenda/salvar")
                        .param("titulo", "Invertido")
                        .param("data", DIA)
                        .param("horaInicio", "10:00")
                        .param("horaFim", "09:00"))
                .andExpect(status().isOk())
                .andExpect(view().name("agenda/formulario"))
                .andExpect(model().attributeHasFieldErrors("horario", "horaFim"));
    }

    @Test
    void salvarSobreUmHorarioOcupadoMostraOConflito() throws Exception {
        salvar("Reuniao", "09:00", "11:00");

        mockMvc.perform(post("/agenda/salvar")
                        .param("titulo", "Dentista")
                        .param("data", DIA)
                        .param("horaInicio", "10:00")
                        .param("horaFim", "12:00"))
                .andExpect(status().isOk())
                .andExpect(view().name("agenda/formulario"))
                .andExpect(model().attributeHasFieldErrors("horario", "horaInicio"))
                .andExpect(content().string(containsString("Reuniao")));
    }

    @Test
    void concluirMarcaEDesmarcaOCompromisso() throws Exception {
        Horario salvo = salvar("Estudo", "09:00", "10:00");

        mockMvc.perform(post("/agenda/{id}/concluir", salvo.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/agenda?data=" + DIA));

        assertThat(service.buscarPorId(salvo.getId()).isConcluido()).isTrue();
    }

    @Test
    void removerApagaOCompromisso() throws Exception {
        Horario salvo = salvar("Estudo", "09:00", "10:00");

        mockMvc.perform(post("/agenda/{id}/remover", salvo.getId()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/agenda?data=" + DIA));

        assertThat(service.listarPorDia(LocalDate.parse(DIA))).isEmpty();
    }

    @Test
    void editarUmIdInexistenteVoltaParaAAgenda() throws Exception {
        mockMvc.perform(get("/agenda/{id}/editar", 404L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/agenda"));
    }

    @Test
    void oFormularioDeEdicaoVemPreenchido() throws Exception {
        Horario salvo = salvar("Estudar Spring Boot", "09:00", "10:30");

        mockMvc.perform(get("/agenda/{id}/editar", salvo.getId()))
                .andExpect(status().isOk())
                .andExpect(view().name("agenda/formulario"))
                .andExpect(model().attribute("edicao", true))
                .andExpect(content().string(containsString("Estudar Spring Boot")))
                .andExpect(content().string(containsString("09:00")));
    }
}
