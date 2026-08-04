package br.com.lucasbellucci.dailyplanner.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Objects;

/**
 * Um compromisso marcado na agenda: o que fazer, em que dia e em que faixa de horario.
 */
@Entity
@Table(name = "horario")
public class Horario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Informe o titulo da tarefa")
    @Size(max = 120, message = "O titulo pode ter no maximo 120 caracteres")
    @Column(nullable = false, length = 120)
    private String titulo;

    @Size(max = 500, message = "A descricao pode ter no maximo 500 caracteres")
    @Column(length = 500)
    private String descricao;

    @NotNull(message = "Informe a data")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    @Column(nullable = false)
    private LocalDate data;

    @NotNull(message = "Informe a hora de inicio")
    @DateTimeFormat(pattern = "HH:mm")
    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @NotNull(message = "Informe a hora de termino")
    @DateTimeFormat(pattern = "HH:mm")
    @Column(name = "hora_fim", nullable = false)
    private LocalTime horaFim;

    @Column(nullable = false)
    private boolean concluido;

    @Column(nullable = false)
    private boolean notificado = false;

    public Horario() {
    }

    public Horario(String titulo, LocalDate data, LocalTime horaInicio, LocalTime horaFim) {
        this.titulo = titulo;
        this.data = data;
        this.horaInicio = horaInicio;
        this.horaFim = horaFim;
    }

    /**
     * Quanto tempo o compromisso ocupa. Retorna zero enquanto o horario ainda nao estiver completo.
     */
    public Duration getDuracao() {
        if (horaInicio == null || horaFim == null || !horaFim.isAfter(horaInicio)) {
            return Duration.ZERO;
        }
        return Duration.between(horaInicio, horaFim);
    }

    /**
     * Duracao no formato "1h30" / "45min", pronta para ser exibida na tela.
     */
    public String getDuracaoFormatada() {
        Duration duracao = getDuracao();
        long horas = duracao.toHours();
        long minutos = duracao.toMinutesPart();
        if (horas > 0 && minutos > 0) {
            return horas + "h" + String.format("%02d", minutos);
        }
        if (horas > 0) {
            return horas + "h";
        }
        return minutos + "min";
    }

    /**
     * Indica se este compromisso ocupa algum minuto em comum com o outro.
     * Encostar o fim de um no inicio do outro (10:00-11:00 e 11:00-12:00) nao e conflito.
     */
    public boolean conflitaCom(Horario outro) {
        if (outro == null || data == null || !data.equals(outro.data)) {
            return false;
        }
        return horaInicio.isBefore(outro.horaFim) && horaFim.isAfter(outro.horaInicio);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public LocalDate getData() {
        return data;
    }

    public void setData(LocalDate data) {
        this.data = data;
    }

    public LocalTime getHoraInicio() {
        return horaInicio;
    }

    public void setHoraInicio(LocalTime horaInicio) {
        this.horaInicio = horaInicio;
    }

    public LocalTime getHoraFim() {
        return horaFim;
    }

    public void setHoraFim(LocalTime horaFim) {
        this.horaFim = horaFim;
    }

    public boolean isConcluido() {
        return concluido;
    }

    public void setConcluido(boolean concluido) {
        this.concluido = concluido;
    }

    public boolean isNotificado() {
        return notificado;
    }

    public void setNotificado(boolean notificado) {
        this.notificado = notificado;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof Horario outro)) {
            return false;
        }
        return id != null && id.equals(outro.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "Horario{id=%s, titulo='%s', data=%s, %s-%s}".formatted(id, titulo, data, horaInicio, horaFim);
    }
}
