package br.com.lucasbellucci.dailyplanner.web;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Locale;

/**
 * Datas escritas em portugues para o cabecalho da agenda.
 */
public final class DatasPtBr {

    private static final Locale BRASIL = Locale.forLanguageTag("pt-BR");
    private static final DateTimeFormatter CURTA = DateTimeFormatter.ofPattern("dd/MM/yyyy", BRASIL);

    private DatasPtBr() {
    }

    /**
     * Exemplo: "Segunda-feira, 3 de agosto de 2026".
     *
     * <p>Apenas a primeira letra e maiuscula. Fazer isso aqui, e nao com
     * {@code text-transform: capitalize} no CSS, evita o resultado errado
     * "Segunda-Feira, 3 De Agosto De 2026".</p>
     */
    public static String porExtenso(LocalDate data) {
        String diaDaSemana = data.getDayOfWeek().getDisplayName(TextStyle.FULL, BRASIL);
        String mes = data.getMonth().getDisplayName(TextStyle.FULL, BRASIL);
        String texto = "%s, %d de %s de %d".formatted(diaDaSemana, data.getDayOfMonth(), mes, data.getYear());
        return texto.substring(0, 1).toUpperCase(BRASIL) + texto.substring(1);
    }

    /**
     * Exemplo: "03/08/2026".
     */
    public static String curta(LocalDate data) {
        return CURTA.format(data);
    }
}
