package br.com.lucasbellucci.dailyplanner.repository;

import br.com.lucasbellucci.dailyplanner.model.Horario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Acesso ao banco. O Spring Data implementa esta interface sozinho em tempo de execucao.
 */
public interface HorarioRepository extends JpaRepository<Horario, Long> {

    List<Horario> findByDataOrderByHoraInicioAscHoraFimAsc(LocalDate data);

    List<Horario> findByDataBetweenOrderByDataAscHoraInicioAsc(LocalDate inicio, LocalDate fim);

    long countByDataAndConcluidoTrue(LocalDate data);

    /**
     * Compromissos do mesmo dia que ocupam algum minuto da faixa informada.
     *
     * @param idIgnorado id que nao deve entrar no resultado (usado na edicao, para o
     *                   compromisso nao conflitar com ele mesmo). Passe -1 ao criar um novo.
     */
    @Query("""
            select h from Horario h
            where h.data = :data
              and h.id <> :idIgnorado
              and h.horaInicio < :horaFim
              and h.horaFim > :horaInicio
            order by h.horaInicio asc
            """)
    List<Horario> buscarConflitos(@Param("data") LocalDate data,
                                  @Param("horaInicio") LocalTime horaInicio,
                                  @Param("horaFim") LocalTime horaFim,
                                  @Param("idIgnorado") Long idIgnorado);
}
