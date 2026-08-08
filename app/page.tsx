import { redirect } from 'next/navigation';

/** Quem abre a raiz vai direto para a agenda de hoje. */
export default function Home() {
  redirect('/agenda');
}
