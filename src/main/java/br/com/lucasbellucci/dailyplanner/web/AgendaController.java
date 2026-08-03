package br.com.lucasbellucci.dailyplanner.web;

import br.com.lucasbellucci.dailyplanner.model.Horario;
import br.com.lucasbellucci.dailyplanner.service.HorarioInvalidoException;
import br.com.lucasbellucci.dailyplanner.service.HorarioNaoEncontradoException;
import br.com.lucasbellucci.dailyplanner.service.HorarioService;
import br.com.lucasbellucci.dailyplanner.service.ResumoDoDia;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.List;

/**
 * Telas da agenda. As paginas sao montadas no servidor com Thymeleaf: o navegador recebe
 * HTML pronto e devolve dados por formularios comuns, sem JavaScript no meio do caminho.
 */
@Controller
@RequestMapping("/agenda")
public class AgendaController {

    private final HorarioService service;

    public AgendaController(HorarioService service) {
        this.service = service;
    }

    @GetMapping
    public String verDia(@RequestParam(required = false)
                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
                         Model model) {
        LocalDate dia = data != null ? data : LocalDate.now();
        List<Horario> horarios = service.listarPorDia(dia);
        ResumoDoDia resumo = service.resumoDoDia(dia);

        model.addAttribute("dia", dia);
        model.addAttribute("horarios", horarios);
        model.addAttribute("resumo", resumo);
        model.addAttribute("diaAnterior", dia.minusDays(1));
        model.addAttribute("diaSeguinte", dia.plusDays(1));
        model.addAttribute("hoje", LocalDate.now());
        model.addAttribute("nomeDoDia", DatasPtBr.porExtenso(dia));
        return "agenda/dia";
    }

    @GetMapping("/novo")
    public String novo(@RequestParam(required = false)
                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
                       Model model) {
        Horario horario = new Horario();
        horario.setData(data != null ? data : LocalDate.now());
        model.addAttribute("horario", horario);
        model.addAttribute("edicao", false);
        return "agenda/formulario";
    }

    @GetMapping("/{id}/editar")
    public String editar(@PathVariable Long id, Model model) {
        model.addAttribute("horario", service.buscarPorId(id));
        model.addAttribute("edicao", true);
        return "agenda/formulario";
    }

    @PostMapping("/salvar")
    public String salvar(@Valid @ModelAttribute("horario") Horario horario,
                         BindingResult erros,
                         Model model,
                         RedirectAttributes redirect) {
        boolean edicao = horario.getId() != null;

        if (!erros.hasErrors()) {
            try {
                service.salvar(horario);
                redirect.addFlashAttribute("mensagem",
                        edicao ? "Compromisso atualizado." : "Compromisso adicionado a agenda.");
                return voltarParaODia(horario.getData(), redirect);
            } catch (HorarioInvalidoException e) {
                erros.rejectValue(e.getCampo(), "horario.invalido", e.getMessage());
            }
        }

        model.addAttribute("edicao", edicao);
        return "agenda/formulario";
    }

    @PostMapping("/{id}/concluir")
    public String alternarConclusao(@PathVariable Long id, RedirectAttributes redirect) {
        Horario horario = service.alternarConclusao(id);
        return voltarParaODia(horario.getData(), redirect);
    }

    @PostMapping("/{id}/remover")
    public String remover(@PathVariable Long id, RedirectAttributes redirect) {
        LocalDate data = service.buscarPorId(id).getData();
        service.remover(id);
        redirect.addFlashAttribute("mensagem", "Compromisso removido.");
        return voltarParaODia(data, redirect);
    }

    @ExceptionHandler(HorarioNaoEncontradoException.class)
    public String horarioNaoEncontrado(HorarioNaoEncontradoException e, RedirectAttributes redirect) {
        redirect.addFlashAttribute("erro", e.getMessage());
        return "redirect:/agenda";
    }

    /**
     * Monta o redirect de volta para o dia editado.
     *
     * <p>A data vai como texto ISO (2026-08-03) de proposito: entregue como {@code LocalDate},
     * o {@code RedirectAttributes} a converteria usando o locale da pagina e geraria
     * {@code 03/08/2026}, formato que o proprio {@code /agenda} nao consegue ler de volta.</p>
     */
    private String voltarParaODia(LocalDate data, RedirectAttributes redirect) {
        redirect.addAttribute("data", data.toString());
        return "redirect:/agenda";
    }
}
