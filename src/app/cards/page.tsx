import CardsClient from "@/app/cards/cards-client";
import { getCardFilterOptions, listCardsForAdmin } from "@/lib/m01-cards";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  notice?: string;
  error?: string;
}>;

export default async function CardManagementPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const [cards, filterOptions] = await Promise.all([
    listCardsForAdmin(),
    getCardFilterOptions(),
  ]);

  return <CardsClient cards={cards} error={searchParams.error} filterOptions={filterOptions} notice={searchParams.notice} />;
}
