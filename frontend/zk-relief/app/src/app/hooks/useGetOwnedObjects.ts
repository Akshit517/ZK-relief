import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

export const useGetOwnedObjects = () => {
  const account = useCurrentAccount();

  // Only provide params if account exists, otherwise provide a dummy value
  const params = account
    ? {
        owner: account.address,
        limit: 5,
        options: { showContent: true },
      }
    : {
        owner: "", // dummy value, won't be used if enabled: false
        limit: 5,
        options: { showContent: true },
      };

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useSuiClientQuery("getOwnedObjects", params, {
    enabled: !!account,
  });

  return {
    data: data?.data?.map((obj) => obj.data) ?? [],
    isLoading,
    isError,
    reFetchData: refetch,
    currentAccount: account,
  };
};
