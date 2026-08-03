package br.com.lucasbellucci.dailyplanner.service;

/**
 * Lancada quando o compromisso quebra uma regra da agenda, como terminar antes de comecar
 * ou ocupar um intervalo que ja pertence a outro compromisso.
 *
 * <p>O {@code campo} indica em qual campo do formulario a mensagem deve aparecer.</p>
 */
public class HorarioInvalidoException extends RuntimeException {

    private final String campo;

    public HorarioInvalidoException(String campo, String mensagem) {
        super(mensagem);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
