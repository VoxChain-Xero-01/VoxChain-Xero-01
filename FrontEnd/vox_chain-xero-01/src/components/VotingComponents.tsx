import { Copy, CopyCheck, ExternalLink, Search, Users } from "lucide-react";
import React, { ChangeEventHandler, useEffect, useState } from "react";
import CreatePolling from "./CreatePolling";
import {
  getContract,
  getContractEvents,
  prepareEvent,
  readContract,
} from "thirdweb";
import { useContractEvents } from "thirdweb/react";
import { client, contract } from "@/lib/client";
import shortenAddress from "@/utils/shortenAddress";
import copyToClipboard from "@/utils/copyPaste";
import Link from "next/link";
import Modal from "./Modal";
import PollInfo from "./PollInfo";
import { sepolia } from "thirdweb/chains";
interface votingProps {
  pollAddress: string;
  creator: string;
  pollName: string;
}
interface detailVoting {
  isCompleted: boolean;
  totalVoters: number;
  startTime: number;
  pollName: string;
  description: string;
  duration: number;
  contractAddress: string;
}

const VotingComponents = () => {
  const [searchVoting, setSearchVoting] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<string>();
  const [isHover, setIsHover] = useState<string>();
  const [openModal, setOpenModal] = useState<string>("");
  const [votingData, setVotingData] = useState<votingProps[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [detailPolls, setDetailsPolls] = useState<detailVoting[]>([]);
  const [winner, setWinner] = useState([]);
  const factoryEvent = prepareEvent({
    signature:
      "event PollCreated(address indexed pollAddress, string indexed pollName, address creator)",
  });

  // event
  const { data: contractEvents, isLoading: isEventsLoading } =
    useContractEvents({
      contract,
      events: [factoryEvent],
    });
  const handleSearch: ChangeEventHandler<HTMLInputElement> = (e) => {
    const target = e.target as HTMLInputElement;
    setSearchVoting(target.value);
    const sliceData = votingData.slice();
    setVotingData(
      sliceData?.filter((item) =>
        item.pollName.toLowerCase().includes(target.value)
      )
    );
  };

  const handleCopy = async (value: string) => {
    try {
      await copyToClipboard(value);
      setIsCopied(value);
      setTimeout(() => {
        setIsCopied("");
        setIsHover("");
      }, 500);
    } catch (error) {
      console.log("Clipboard API not supported");
    }
  };

  // interact with smart contract
  useEffect(() => {
    if (!isEventsLoading && contractEvents) {
      const fetchDataPolls = async () => {
        try {
          setIsLoading(true);

          // Get total polls count first
          const totalPolls = await readContract({
            contract,
            method: "function getTotalPolls() view returns (uint256)",
            params: [],
          });

          // Create array of indices from 1 to totalPolls
          const indices = Array.from(
            { length: Number(totalPolls) },
            (_, i) => i + 1
          );

          // Fetch all polls in parallel
          const pollsData = await Promise.all(
            indices.map((i) =>
              readContract({
                contract,
                method:
                  "function getPoll(uint256 count) view returns ((address pollAddress, address creator, string pollName))",
                params: [BigInt(i)],
              })
            )
          );
          // Fetch all poll details in parallel
          const detailPollDatas = await Promise.all(
            pollsData.map((poll) =>
              readContract({
                contract,
                method:
                  "function getPollExtendedInfo(address pollAddress) view returns (string, string, uint256, uint256, uint256, address, bool)",
                params: [poll.pollAddress],
              }).then(
                ([
                  pollName,
                  description,
                  duration,
                  startTime,
                  totalVoters,
                  contractAddress,
                  isCompleted,
                ]) => ({
                  isCompleted,
                  totalVoters: Number(totalVoters),
                  startTime: Number(startTime),
                  pollName,
                  description,
                  duration: Number(duration),
                  contractAddress,
                })
              )
            )
          );
          // console.log("detail poll", detailPollDatas);
          setVotingData(pollsData);
          setDetailsPolls(detailPollDatas);
        } catch (error) {
          console.error("Error fetching poll data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchDataPolls();
    }
  }, [contractEvents, isEventsLoading]);

  useEffect(() => {
    if (votingData.length > 0) {
      async function winnerDeclared() {
        const winnerEvents = votingData.map(async (item) => {
          const contractEvent = getContract({
            address: item.pollAddress,
            chain: sepolia,
            client: client,
          });
          const preparedVoted = prepareEvent({
            signature: "event Voted(address _voter, string _candidate)",
          });

          const data = await getContractEvents({
            contract: contractEvent,
            events: [preparedVoted],
          });

          return data;
        });
        console.log(votingData[0].pollAddress);
        // setWinner(winnerEvents);
      }
      winnerDeclared();
    }
  }, [votingData]);
  return (
    <div className="w-full px-10  mt-20 font-inter">
      {/* modal create voting */}
      <CreatePolling isOpen={isOpen} setIsOpen={setIsOpen} />
      {/* search and create voting */}
      <div className="flex sm:flex-row flex-col gap-y-5 items-center sm:justify-between mx-auto">
        {/* search */}
        <div className="flex-1 flex justify-center gap-6 items-center  px-10">
          <label
            htmlFor="search-voting"
            className="bg-gray-custom p-1 rounded-full inline-block cursor-pointer "
          >
            <Search size={25} color="white" />
          </label>
          <div className="max-w-[753px] w-full bg-gray-custom rounded-full px-1 py-1">
            <input
              value={searchVoting}
              onChange={handleSearch}
              id={"search-voting"}
              type="text"
              className="h-full w-full text-white px-3 outline-none "
            />
          </div>
        </div>
        {/* create voting */}
        <button
          onClick={() => setIsOpen((open) => !open)}
          className="w-[8.813rem] h-[2.125rem] bg-purple-light hover:bg-purple-700 cursor-pointer flex justify-center items-center text-white rounded-md"
        >
          + Create Voting
        </button>
      </div>
      {/* voting data */}
      <div className="container mx-auto ">
        <div className="text-white grid xl:grid-cols-4 md:grid-cols-3 grid-cols-2  gap-3 mt-20">
          {isLoading ? (
            <div className="w-full max-w-[18.75rem] h-[11.625rem] flex justify-center items-center  px-4 py-4 rounded-2xl relative bg-purple-dark">
              <div>Loading...</div>
            </div>
          ) : (
            votingData.map((value, i) => (
              <div
                key={i}
                className="w-full max-w-[18.75rem] h-[11.625rem] flex justify-center items-center  px-4 py-4 rounded-2xl relative bg-purple-dark cursor-pointer"
              >
                {/* link / modal / popup */}
                <div
                  onClick={() => setOpenModal(value.pollAddress)}
                  // href={`/poll/${value.pollAddress}`}
                  className="absolute inset-0"
                ></div>
                {openModal == value.pollAddress ? (
                  <Modal
                    handleCloseModal={() => {
                      setOpenModal("");
                    }}
                  >
                    <PollInfo
                      creator={value.creator}
                      address={value.pollAddress}
                    />
                  </Modal>
                ) : null}
                {/* progress icon */}
                <div className="bg-[#4A148C] rounded-full flex justify-center items-center gap-1 w-fit px-3 py-1 absolute top-4 left-3">
                  <div
                    className={` ${
                      detailPolls[i].isCompleted
                        ? "bg-green-400"
                        : "bg-yellow-400"
                    }  animate-pulse  size-3.5 border-1 border-black rounded-full`}
                  />
                  <p className="text-sm">
                    {detailPolls[i].isCompleted ? "Completed" : "In Progress"}
                  </p>
                </div>
                {/* header */}
                <div className="text-center">{value.pollName}</div>
                {/* max participants */}
                <div className="absolute bottom-3 pr-7 pl-5 flex justify-between w-full">
                  <div className="flex gap-2 cursor-pointer relative">
                    {isHover == value.pollAddress && (
                      <div className="absolute -top-7 bg-black px-2 text-xs rounded-sm">
                        Copied me !
                      </div>
                    )}
                    {isCopied == value.pollAddress ? (
                      <CopyCheck />
                    ) : (
                      <Copy
                        className="size-5 sm:size-6"
                        onClick={() => handleCopy(value.pollAddress)}
                        onMouseEnter={() => setIsHover(value.pollAddress)}
                        onMouseLeave={() => setIsHover("")}
                      />
                    )}
                    {/* link sepolia  desktop*/}
                    <Link
                      target="_blank"
                      href={`https://sepolia.etherscan.io/address/${value.pollAddress}`}
                      className="hidden sm:flex hover:underline group justify-center items-center gap-2"
                    >
                      {shortenAddress(value.pollAddress)}
                      <ExternalLink
                        size={15}
                        className="hidden group-hover:block"
                      />
                    </Link>
                    {/*  link sepolia mobile */}
                    <Link
                      target="_blank"
                      href={`https://sepolia.etherscan.io/address/${value.pollAddress}`}
                      className="flex sm:hidden justify-center items-center"
                    >
                      <ExternalLink size={16} className="" />
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <Users fill="white" />
                    {detailPolls[i].totalVoters}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VotingComponents;
