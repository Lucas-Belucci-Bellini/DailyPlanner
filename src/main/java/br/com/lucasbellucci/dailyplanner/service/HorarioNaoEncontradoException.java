package br.com.lucasbellucci.dailyplanner.service;

/**
 * Lancada quando alguem pede um compromisso que nao existe mais no banco.
 */
public class HorarioNaoEncontradoException extends RuntimeException {

    public HorarioNaoEncontradoException(Long id) {
        super("Nenhum compromisso encontrado com o id " + id);
    }
}
