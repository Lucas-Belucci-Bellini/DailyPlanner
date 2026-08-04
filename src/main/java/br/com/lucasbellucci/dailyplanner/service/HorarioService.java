package br.com.lucasbellucci.dailyplanner.service;

import br.com.lucasbellucci.dailyplanner.model.Horario;
import br.com.lucasbellucci.dailyplanner.repository.HorarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

/**
 * Regras da agenda. Toda gravacao passa por aqui, entao as validacoes valem tanto para a
 * tela quanto para qualquer outro ponto que venha a usar o servico.
 */
@Service
@Transactional(readOnly = true)
public class HorarioService {

    /** Id impossivel, usado para dizer ao banco que nao ha nada a ignorar na busca por conflitos. */
    private static final long NENHUM_ID = -1L;

    private final HorarioRepository repository;

    public HorarioService(HorarioRepository repository) {
        this.repository = repository;
    }

    public List<Horario> listarPorDia(LocalDate data) {
        return repository.findByDataOrderByHoraInicioAscHoraFimAsc(data);
    }

    public List<Horario> listarPorPeriodo(LocalDate inicio, LocalDate fim) {
        return repository.findByDataBetweenOrderByDataAscHoraInicioAsc(inicio, fim);
    }

    public Horario buscarPorId(Long id) {
        return repository.findById(id).orElseThrow(() -> new HorarioNaoEncontradoException(id));
    }

    public ResumoDoDia resumoDoDia(LocalDate data) {
        List<Horario> horarios = listarPorDia(data);
        if (horarios.isEmpty()) {
            return ResumoDoDia.vazio(data);
        }
        Duration ocupado = horarios.stream()
                .map(Horario::getDuracao)
                .reduce(Duration.ZERO, Duration::plus);
        long concluidos = repository.countByDataAndConcluidoTrue(data);
        return new ResumoDoDia(data, horarios.size(), concluidos, ocupado);
    }

    /**
     * Compromissos ja marcados que disputam algum minuto com o horario informado.
     */
    public List<Horario> conflitos(Horario horario) {
        if (horario.getData() == null || horario.getHoraInicio() == null || horario.getHoraFim() == null) {
            return List.of();
        }
        Long idIgnorado = horario.getId() == null ? NENHUM_ID : horario.getId();
        return repository.buscarConflitos(horario.getData(), horario.getHoraInicio(), horario.getHoraFim(), idIgnorado);
    }

    /**
     * Cria ou atualiza um compromisso, recusando intervalos invalidos e sobreposicoes.
     *
     * @throws HorarioInvalidoException quando o termino nao vem depois do inicio ou quando o
     *                                  intervalo colide com outro compromisso do mesmo dia
     */
    @Transactional
    public Horario salvar(Horario horario) {
        validarIntervalo(horario);
        validarConflitos(horario);
        if (horario.getDescricao() != null && horario.getDescricao().isBlank()) {
            horario.setDescricao(null);
        }
        return repository.save(horario);
    }

    @Transactional
    public Horario alternarConclusao(Long id) {
        Horario horario = buscarPorId(id);
        horario.setConcluido(!horario.isConcluido());
        return repository.save(horario);
    }

    @Transactional
    public void remover(Long id) {
        if (!repository.existsById(id)) {
            throw new HorarioNaoEncontradoException(id);
        }
        repository.deleteById(id);
    }

    private void validarIntervalo(Horario horario) {
        if (horario.getHoraInicio() == null || horario.getHoraFim() == null) {
            return; // a anotacao @NotNull da entidade ja cuida do campo em branco
        }
        if (!horario.getHoraFim().isAfter(horario.getHoraInicio())) {
            throw new HorarioInvalidoException("horaFim", "O termino precisa ser depois do inicio");
        }
    }

    private void validarConflitos(Horario horario) {
        List<Horario> conflitos = conflitos(horario);
        if (conflitos.isEmpty()) {
            return;
        }
        Horario primeiro = conflitos.get(0);
        throw new HorarioInvalidoException("horaInicio",
                "Esse intervalo ja esta ocupado por \"%s\" (%s as %s)"
                        .formatted(primeiro.getTitulo(), primeiro.getHoraInicio(), primeiro.getHoraFim()));
    }
}
